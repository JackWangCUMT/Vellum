define([
    'underscore',
    'chai',
    'vellum/escapedHashtags',
    'tests/utils',
    'text!static/escapedHashtags/invalid-xpath.xml',
], function (
    _,
    chai,
    escapedHashtags,
    util,
    INVALID_XPATH_XML
) {
    var assert = chai.assert;

    describe("The escaped hashtag parser", function () {
        function transformToProperty(input) {
            var ret = input.split('/');
            return ret[ret.length-1];
        }

        var hashtagMap = {
                "#form/text1": "/data/text1",
                "#form/text2": "/data/text2",
            },
            hashtagInfo = {
                hashtagMap: hashtagMap,
                invertedHashtagMap: _.object(_.map(
                    hashtagMap, function (v, k) { return [v, k]; }))
            };

        describe("#transform()", function() {
            var testCases = [
                ["`#case/type/prop`", "#case/type/prop", "prop"],
                ["`#case/type/prop`- 1", "#case/type/prop - 1", "prop - 1"],
                ["(`#case/type/prop`)", "(#case/type/prop)", "(prop)"],
                ["(`#case/type/prop`", "(#case/type/prop", "(prop"],
                [
                    "`#case/type/prop` = `#case/type/prop2`",
                    "#case/type/prop = #case/type/prop2",
                    "prop = prop2",
                ],
                ["``", "`", "`"],
                ["🍊you glad I didn't use 🍌`", "🍊you glad I didn't use 🍌`", "🍊you glad I didn't use 🍌`"],
                ["`🍠", "`🍠", "`🍠"], // u1f360 conflicts with ` (u0060)
                ["`#case/type/prop` = `", "#case/type/prop = `",  "prop = `"],
                ["`#case/type/prop` = ``", "#case/type/prop = `", "prop = `"],
                ["`#case/prop1``#case/prop2` = ``", "#case/prop1#case/prop2 = `", "prop1prop2 = `"],
                ["``#case/type/``prop` = ``", "`#case/type/`prop = `", "`#case/type/`prop = `"],
            ];

            testCases.forEach(function (testCase) {
                var input = testCase[0],
                    outputNoTransform = testCase[1],
                    outputToProp = testCase[2];

                it("default transform should parse " + input + " into " + outputNoTransform, function() {
                    assert.strictEqual(escapedHashtags.transform(input), outputNoTransform);
                });

                it("custom transform should parse " + input + " into " + outputToProp, function() {
                    assert.strictEqual(escapedHashtags.transform(input, transformToProperty), outputToProp);
                });
            });
        });

        describe("#toEscapedHashtag()", function() {
            var testCases = [
                    ["#form/text1", "`#form/text1`"],
                    ["/data/text1", "`#form/text1`"],
                    ["`#form/text1`", "`#form/text1`"],

                    ["#form/text1 -1", "`#form/text1` - 1"],
                    ["/data/text1 -1", "`#form/text1` - 1"],
                    // ideally no change, but too hard right now (to much extra parsing going on)
                    ["`#form/text1`-1", "`#form/text1` - 1"],
                ],
                parser = escapedHashtags.parser(hashtagInfo);

            testCases.forEach(function(testCase) {
                it("should parse " + testCase[0] + " into " + testCase[1], function() {
                    assert.strictEqual(parser.parse(testCase[0]).toEscapedHashtag(), testCase[1]);
                });
            });
        });

        describe("#toXPath()", function() {
            var testCases = [
                    ["`/data/text1`", "/data/text1"],
                    ["`#form/text1`", "/data/text1"],
                    ["`#form/text1`-1", "/data/text1 - 1"],
                ],
                parser = escapedHashtags.parser(hashtagInfo);

            testCases.forEach(function(testCase) {
                it("should parse " + testCase[0] + " into " + testCase[1], function() {
                    assert.strictEqual(parser.parse(testCase[0]).toXPath(), testCase[1]);
                });
            });
        });
    });

    describe("The form's escaped hashtag parser", function() {
        before(function (done) {
            util.init({
                javaRosa: { langs: ['en'] },
                core: {
                    onReady: function () {
                        done();
                    }
                },
                features: {rich_text: false},
            });
        });

        it("writes invalid xml with #invalid", function () {
            util.loadXML(INVALID_XPATH_XML);
            var text = util.getMug('text'),
                hidden = util.getMug('hidden');
            assert.strictEqual(text.p.relevantAttr, '(`#form/hidden`');
            assert.strictEqual(hidden.p.calculateAttr, '`#form/text`');
        });
    });

    describe("The escaped hashtag", function () {
        before(function (done) {
            util.init({
                javaRosa: { langs: ['en'] },
                core: {
                    onReady: function () {
                        done();
                    }
                },
            });
        });

        it("writes invalid xml with #invalid", function () {
            util.loadXML("");
            var text = util.addQuestion('Text', 'text'),
                hidden = util.addQuestion('DataBindOnly', 'hidden');
            text.p.relevantAttr = '(`#form/hidden`'; // invalid xml
            hidden.p.calculateAttr = '`#form/text`';
            util.assertXmlEqual(
                util.call("createXML"),
                INVALID_XPATH_XML,
                {normalize_xmlns: true}
            );
        });
    });
});
