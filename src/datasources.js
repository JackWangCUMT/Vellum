/**
 * Asynchronously loads data sources
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
    var builders = {};

    /**
     * Initialize and return a datasources loader
     *
     * This function is called during core init.
     *
     * The returned "eventuality" object fires one of two events:
     *
     *  - change - fired when data sources changed. Currently this only
     *      happens once when data sources are first loaded.
     *  - error - fired when data sources could not be loaded.
     */
    function init(endpoint, invalidCaseProperties) {
        var that = util.eventuality({
            endpoint: endpoint,
            invalidCaseProperties: invalidCaseProperties,
        });

        that.reset = function () {
            that.retryTimeout = 1000;
            that.cache = {};
        };

        that.isReady = function () {
            return getValue(that, "sources") !== undefined;
        };

        that.getDataSources = function (defaultValue) {
            return getValue(that, "sources", defaultValue);
        };

        that.getDataNodes = function (defaultValue) {
            return getValue(that, "dataNodes", defaultValue);
        };

        that.getHashtagMap = function (defaultValue) {
            return getValue(that, "hashtagMap", defaultValue);
        };

        that.getHashtagTransforms = function (defaultValue) {
            return getValue(that, "hashtagTransforms", defaultValue);
        };

        /**
         * Add callback to be called immediately if ready and also on change.
         *
         * @return a function that unbinds the callback.
         */
        that.onChangeReady = function (callback) {
            var context = {};
            if (that.isReady()) {
                callback();
            }
            that.on("change", callback, null, null, context);
            return function () { that.unbind(context, "change"); };
        };

        that.reset();
        if (endpoint && _.isString(endpoint)) {
            loadDataSources(that);
        }

        return that;
    }

    /**
     * Asynchronously load data sources
     */
    function loadDataSources(that) {
        function finish(data) {
            that.cache = {sources: data.length ? data : [{
                id: "",
                uri: "",
                path: "",
                name: "Not Found",
                structure: {}
            }]};
            that.loading = false;
            that.fire("change");
        }

        function onError(jqXHR, errorType, error) {
            that.fire({
                type: "error",
                xhr: jqXHR,
                errorType: errorType,
                error: error,
            });
            window.console.log(util.formatExc(error || errorType));
            if (that.retryTimeout < 8001) {  // 8000 = 4 retries
                // exponential backoff retry
                setTimeout(function () {
                    loadDataSources(that);
                }, that.retryTimeout);
                that.retryTimeout = that.retryTimeout * 2;
            }
        }

        if (that.endpoint) {
            if (_.isString(that.endpoint)) {
                that.loading = true;
                $.ajax({
                    type: 'GET',
                    url: that.endpoint,
                    dataType: 'json',
                    success: finish,
                    error: onError,
                    data: {}
                });
            } else {
                that.endpoint(finish);
            }
        } else {
            finish([]);
        }
    }

    /**
     * Get value derived from loaded data sources
     *
     * This function delegates to a "builder" function. Each "builder"
     * function must return either the built object (not `undefined`)
     * or `undefined` to indicate that the value is not available yet.
     *
     * @param that - datasources instance.
     * @param name - the name of the value to get.
     * @param defaultValue - the value to return if the requested value
     *      cannot be built (because data sources are not yet loaded).
     * @returns the requested value
     */
    function getValue(that, name, defaultValue) {
        var cache = that.cache;
        if (cache.hasOwnProperty(name)) {
            return cache[name];
        }
        var value = builders[name](that);
        if (value !== undefined) {
            cache[name] = value;
            return value;
        }
        return defaultValue;
    }

    builders.sources = function (that) {
        if (!that.loading) {
            loadDataSources(that);
        }
        return that.cache.sources;
    };

    /**
     * Build a list of data nodes
     *
     * Each node represents a known entity that can be referenced by
     * hashtag and/or xpath expression.
     */
    builders.dataNodes = function (that) {
        function node(source, parentPath, info, index) {
            return function (item, id) {
                if (_.contains(that.invalidCaseProperties, id)) {
                    return null;
                }

                var path = parentPath ? (parentPath + "/" + id) : id,
                    tree = getTree(item, id, path, info),
                    hashtagPrefix = null,
                    hashtag = null;
                if (source && source.id !== "commcaresession") {
                    // magic: case as the id means that this is the base case
                    hashtagPrefix = '#case/' + (source.id !== 'case' ? source.id + '/' : '');
                    hashtag = hashtagPrefix + id;
                }
                return {
                    name: tree.name,
                    hashtag: hashtag,
                    hashtagPrefix: hashtagPrefix,
                    parentPath: parentPath,
                    xpath: path,
                    index: index || false,
                    sourceInfo: info,
                    getNodes: tree.getNodes,
                    recursive: tree.recursive,
                };
            };
        }
        function getTree(item, id, path, info) {
            var tree = {name: item.name || id, recursive: false},
                source = item,
                children = null;
            if (!item.structure && item.reference) {
                var ref = item.reference;
                source = sources[ref.source || info.id];
                if (source) {
                    info = _.extend(_.omit(source, "structure"), {_parent: info});
                    path = "instance('" + source.id + "')" + source.path +
                           "[" + ref.key + " = " + path + "]";
                    if (source.subsets && ref.subset) {
                        // magic: match key: "@case_type"
                        source = _.findWhere(
                            source.subsets,
                            {id: ref.subset, key: "@case_type"}
                        ) || source;
                    }
                    var name = source.name || source.id;
                    if (name) {
                        tree.name = name;
                    }
                    if (seen.hasOwnProperty(source.id)) {
                        // defer to prevent infinite loop
                        tree.recursive = true;
                    } else {
                        seen[source.id] = true;
                    }
                }
            }
            tree.getNodes = function () {
                if (children === null) {
                    children = getNodes(source, path, info);
                }
                return children;
            };
            return tree;
        }
        function getNodes(source, path, info) {
            var nodes = _.chain(source && source.structure)
                .map(node(source, path, info))
                .compact() // TODO remove with invalidCaseProperties
                .sortBy("text")
                .value();
            if (source && source.related) {
                nodes = _.chain(source.related)
                    .map(function (subset, relation) {
                        // magic: reference key: @case_id
                        var item = {reference: {subset: subset, key: "@case_id"}};
                        // magic: append "/index" to path
                        return node(source, path + "/index", info, true)(item, relation);
                    })
                    .sortBy("text")
                    .value()
                    .concat(nodes);
            }
            return nodes;
        }

        var sources = getValue(that, "sources"),
            seen = {},
            nodes;
        if (sources) {
            sources = sources = _.indexBy(sources, "id");
            if (sources.commcaresession) {
                var source = sources.commcaresession,
                    info = _.omit(source, "structure"),
                    path = "instance('" + source.id + "')" + source.path;
                // do not show Session node for now
                nodes = node(source, null, info)(source, path).getNodes();
            }
        }
        return nodes;
    };

    /**
     * Intermediate builder; extracts hashtags and transforms from data nodes.
     */
    builders.hashtags = function (that) {
        function walk(nodes, hashtags) {
            _.each(nodes, function (node) {
                if (node.hashtag && !node.index) {
                    hashtags.map[node.hashtag] = node.xpath;
                    hashtags.transforms[node.hashtagPrefix] = function (prop) {
                        return node.parentPath + "/" + prop;
                    };
                }
                if (!node.recursive) {
                    walk(node.getNodes(), hashtags);
                }
            });
            return hashtags;
        }
        var nodes = getValue(that, "dataNodes");
        return nodes ? walk(nodes, {map: {}, transforms: {}}) : undefined;
    };

    /**
     * Build an object containing hashtags mapped to XPath expressions.
     */
    builders.hashtagMap = function (that) {
        var hashtags = getValue(that, "hashtags");
        return hashtags && hashtags.map;
    };

    /**
     * Build an object containing hashtag transformations.
     *
     * {"#case/": function (prop) { return "#case/" + prop; }}
     */
    builders.hashtagTransforms = function (that) {
        var hashtags = getValue(that, "hashtags");
        return hashtags && hashtags.transforms;
    };

    return {init: init};
});
