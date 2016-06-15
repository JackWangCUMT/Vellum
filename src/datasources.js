/**
 * Asynchronously loads data sources from vellum.opts().core.dataSourcesEndpoint
 * Currently only supports fixtures
 *
 * Format in opts:
 * dataSourcesEndpoint: function(callback) or string (URL)
 *
 * The endpoint function receives a callback argument. It should call the
 * `callback` with a list of the following structure (for a URL, the response
 * should be JSON in this format):
 * [
 *      {
 *          id: string (used in instance definition)
 *          uri: string (used in the instance definition)
 *          path: string (used in nodeset)
 *          name: string (human readable name)
 *          structure: nested dictionary of elements and attributes
 *          {
 *              element: {
 *                  structure: {
 *                      inner-element: { }
 *                  }
 *                  name: "Element" (the text used in dropdown for this element)
 *              },
 *              ref-element: {
 *                  reference: {
 *                      source: string (optional data source id, defaults to this data source)
 *                      subset: string (optional subset id)
 *                      key: string (referenced property)
 *                  }
 *              },
 *              @attribute: { }
 *          },
 *          subsets: [{
 *              id: string (unique identifier for this subset)
 *              key: string (unique identifier property name)
 *              name: string (human readable name)
 *              structure: { ... }
 *              related: {
 *                  string (relationship): string (related subset name),
 *                  ...
 *              }
 *          }]
 *      },
 *      ...
 * ]
 *
 * Elements can be nested indefinitely with structure keys describing inner
 * elements and attributes. Any element that has a `structure` key may also
 * have a `subsets` key, which defines structure specific to a subset of the
 * elements at that level of the tree. The structure of a subset is merged
 * with the unfiltered element structure, which means that all elements and
 * attributes available in the unfiltered element are also avaliable in the
 * filtered subset.
 *
 * The result of that would be (if used in an itemset):
 *
 *     <instance src="{source.uri}" id="{source.id}">
 *     ...
 *     <itemset nodeset="instance('{source.id}'){source.path}" />
 *
 *
 * The dropdown would have options:
 *
 *     name             (nodeset: instance('{source.id}'){source.path})
 *     name - Element   (nodeset: instance('{source.id}'){source.path}/element)
 *
 */
define([
    'jquery',
    'underscore',
    'vellum/util',
], function (
    $,
    _,
    util
) {
    var dataSourcesEndpoint, dataCache, dataCallbacks, errorCallbacks;

    // called during core init
    function init(instance) {
        dataSourcesEndpoint = instance.opts().core.dataSourcesEndpoint;
        reset();
    }

    function reset() {
        dataCache = null;
        dataCallbacks = [];
        errorCallbacks = [];
    }

    /**
     * Asynchronously load data sources
     *
     * @param successCallback - A function to be called when the data sources
     *      have been loaded. This function should accept one argument,
     *      a list of data source objects.
     * @param errorCallback - A function to be called if the data sources call
     *      fails. This function's parameters are passed directly from jQuery's
     *      error callback: the XHR, a status string, and an error string.
     */
    function getDataSources(successCallback, errorCallback) {
        if (dataCache) {
            successCallback(dataCache);
            return;
        }
        if (dataCallbacks.length) {
            dataCallbacks.push(successCallback);
            errorCallbacks.push(errorCallback);
            return;
        }

        function finish(data) {
            dataCache = data.length ? data : [{
                id: "",
                uri: "",
                path: "",
                name: "Not Found",
                structure: {}
            }];
            _.each(_.compact(dataCallbacks), function (callback) {
                callback(dataCache);
            });
            dataCallbacks = [];
        }
        dataCallbacks.push(successCallback);
        errorCallbacks.push(errorCallback);
        if (dataSourcesEndpoint) {
            if (_.isString(dataSourcesEndpoint)) {
                $.ajax({
                    type: 'GET',
                    url: dataSourcesEndpoint,
                    dataType: 'json',
                    success: finish,
                    error: function (jqXHR, errorType, exc) {
                        finish([]);
                        errorCallbacks = _.compact(errorCallbacks);
                        _.each(errorCallbacks, function(callback) {
                            callback(jqXHR, errorType, exc);
                        });
                        if (!errorCallbacks.length) {
                            window.console.log(util.formatExc(exc || errorType));
                        }
                        errorCallbacks = [];
                    },
                    data: {}
                });
            } else {
                dataSourcesEndpoint(finish);
            }
        } else {
            finish([]);
        }
    }

    return {
        init: init,
        reset: reset,
        getDataSources: getDataSources,
    };
});
