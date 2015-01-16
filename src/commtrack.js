define([
    'vellum/form',
    'jquery',
    'underscore',
    'vellum/mugs',
    'vellum/parser',
    'vellum/tree',
    'vellum/util',
    'vellum/core'
], function (
    form_,
    $,
    _,
    mugs,
    parser,
    Tree,
    util
) {
    var setvalueData = [
            {
                attr: "entryId",
                path: "entry/@id"
            }, {
                attr: "src",
                path: "@src"
            }, {
                attr: "dest",
                path: "@dest"
            }, {
                attr: "date",
                path: "@date"
            }
        ],
        transferMugOptions = {
            typeName: 'Transfer',
            isDataOnly: true,
            supportsDataNodeRole: true,
            parseDataNode: function (mug, $node) {
                mug.p.sectionId = mug.p.rawDataAttributes["section-id"];
                delete mug.p.rawDataAttributes["section-id"];
                return $([]); // is this right?
            },
            dataChildFilter: function (children, mug) {
                return [new Tree.Node(children, {
                    getNodeID: function () { return "entry"; },
                    p: {rawDataAttributes: null},
                    options: {
                        getExtraDataAttributes: function (mug) {
                            return {id: "", quantity: ""};
                        }
                    }
                })];
            },
            getExtraDataAttributes: function (mug) {
                // HACK must happen before <setvalue> and "other" <instance> elements are written
                prepareForWrite(mug);
                var attrs = mug.p.rawDataAttributes || {};
                return {
                    xmlns: "http://commcarehq.org/ledger/v1",
                    src: attrs.src || "",
                    dest: attrs.dest || "",
                    date: attrs.date || "",
                    "section-id": mug.p.sectionId,
                    "vellum:role": "Transfer"
                };
            },
            getBindList: function (mug) {
                mug.form.controlTree.walk(function (mug, nodeID, processChildren) {
                    processChildren();
                });
                return [{
                    nodeset: mug.form.getAbsolutePath(mug) + "/entry/@quantity",
                    calculate: mug.p.quantity
                }];
            },
            init: function (mug, form) {
                mug.p.sectionId = "";
                mug.p.quantity = "";
                mug.p.entryId = {value: "", event: "jr-insert"};
                mug.p.src = {value: "", event: "jr-insert"};
                mug.p.dest = {value: "", event: "jr-insert"};
                mug.p.date = {value: "today()", event: "jr-insert"};
            },
            spec: {
                sectionId: { presence: "optional" },
                quantity: { presence: "optional" },
                xmlnsAttr: { presence: "optional" },
                requiredAttr: { presence: "notallowed" },
                constraintAttr: { presence : "notallowed" },
                calculateAttr: { visibility: "notallowed" }
            }
        };

    $.vellum.plugin("commtrack", {}, {
        getMugTypes: function () {
            var types = this.__callOld();
            types.normal.Transfer = util.extend(mugs.defaultOptions, transferMugOptions);
            return types;
        },
        parseBindElement: function (form, el, path) {
            var mug = form.getMugByPath(path);
            if (!mug) {
                var basePath = path.replace(/\/entry\/@quantity$/, "");
                if (path !== basePath) {
                    mug = form.getMugByPath(basePath);
                    if (isTransfer(mug)) {
                        mug.p.quantity = el.attr("calculate");
                        return;
                    }
                }
            }
            this.__callOld();
        },
        handleMugParseFinish: function (mug) {
            this.__callOld();
            if (!isTransfer(mug)) {
                return;
            }
            var path = mug.form.getAbsolutePath(mug);
            mug.p.setvalues = {};
            var values = _.object(_.map(mug.form.getSetValues(), function (value) {
                    return [value.ref, value];
                }));
            _.each(setvalueData, function (data) {
                mug.p[data.attr] = values[path + "/" + data.path] || {
                    event: "jr-insert",
                    value: ""
                };
            });
        }
    });

    function isTransfer(mug) {
        return mug && mug.__className === "Transfer";
    }

    function prepareForWrite(mug) {
        var path = mug.form.getAbsolutePath(mug);

        // update <setvalue> refs
        _.each(setvalueData, function (data) {
            var value = mug.p[data.attr];
            if (!value.ref) {
                mug.p[data.attr] = mug.form.addSetValue(
                    value.event,
                    path + "/" + data.path,
                    value.value
                );
            } else {
                value.ref = path + "/" + data.path;
            }
        });
    }
});
