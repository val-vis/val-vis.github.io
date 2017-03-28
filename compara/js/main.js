/* This script will be executed once page is loaded */
var filePath = "data/full.json";

/* Original Code: https://bl.ocks.org/mbostock/4339083 */
/* Zoom: http://jsfiddle.net/augburto/YMa2y/ */
/* Initial config */

const DEPTH_FACTOR = 200; // link distance
const WIDTH = 2000;
const HEIGHT = 1000;
const DURATION = 400;

var margin = {
        top: 20,
        right: 120,
        bottom: 20,
        left: 120
    },
    width = WIDTH - margin.right - margin.left,
    height = HEIGHT - margin.top - margin.bottom;

var i = 0,
    root;

var tree = d3.layout.tree()
    .size([height, width]);
    // .nodeSize([4, 2]);

var diagonal = d3.svg.diagonal()
    .projection(function(d) {
        return [d.y, d.x];
    });

var svg = d3.select("body").append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom)
    .call(zm = d3.behavior.zoom().scaleExtent([1,3]).on("zoom", redraw)) // zoom
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

//necessary so that zoom knows where to zoom and unzoom from
zm.translate([350, 20]);

var nid = 1; // node id
var relationships = {};

d3.json(filePath, function(error, data) {
    if (error) throw error;

    root = {
        "name": "Comparative Toolsets",
        "children": []
    };

    root = processData(data);
    root.x0 = height / 2;
    root.y0 = 0;

    expandAll();
    // root.children.forEach(collapse);
    // update(root);

    d3.select(self.frameElement).style("height", "800px");

    /* parse a specific structure of a collection of software where is of the form,
    {
      "name":<Second Level>,
      "children":[
        {
          "name":<Third Level>,
          "children":[
            {
              "name":<Leaf>,
              <attr1>:<field1>,
              ...
              <attrN>:<fieldN>
            }
          ]
        }
      ]
    }
    */
    function processData(data) {
        var hierarchy = {};

        if (data.length > 0) {
            data.forEach(function(d) {
                var leaf = d.children[0].children[0];
                leaf.nid = getNewId(); // assign new id

                // construct relationship mappings
                for (var attr in leaf) {
                    if ((attr !== "name") && (attr !== "nid")) {
                        if (!relationships[attr]) {
                            var attrMap = {};

                            if (leaf[attr]) {
                                var keywords = leaf[attr].split(',');

                                for (var i in keywords) {
                                    kw = keywords[i].replace(/^\s+|\s+$/gm,''); // trim space
                                    attrMap[kw] = [leaf.nid];
                                }
                            } else { // the value for this attribute is empty
                                attrMap[attr] = null;
                            }

                            relationships[attr] = attrMap;
                        } else {
                            var attrMap = relationships[attr];

                            if (leaf[attr]) { // there are values
                                var keywords = leaf[attr].split(',');

                                for (var i in keywords) {
                                    kw = keywords[i].replace(/^\s+|\s+$/gm,''); // trim space

                                    if (!attrMap[kw]) { // new keyword
                                        attrMap[kw] = [leaf.nid];
                                    } else { // existing keyword
                                        attrMap[kw].push(leaf.nid);
                                    }
                                }
                            }
                            // if the entry is empty, just skip
                        }
                    }
                }

                // construct hierarchical structure
                if (!hierarchy[d.name]) {
                    var secondlvl = {};

                    // third level
                    secondlvl[d.children[0].name] = [leaf];
                    hierarchy[d.name] = secondlvl;
                } else { // if the 2nd level category exists
                    // check if 3rd level exists
                    if (!hierarchy[d.name][d.children[0].name]) {
                        hierarchy[d.name][d.children[0].name] = [leaf];
                    } else {
                        hierarchy[d.name][d.children[0].name].push(leaf);
                    }
                }
            });
        }

        console.log(hierarchy);
        console.log(relationships);

        for (var secondlvlKey in hierarchy) {
            var secondlvlNodes = {
                "name": secondlvlKey,
                "children": []
            };

            for (var thirdlvlKey in hierarchy[secondlvlKey]) {
                var thirdlvlNodes = {
                    "name": thirdlvlKey,
                    "children": hierarchy[secondlvlKey][thirdlvlKey]
                };

                secondlvlNodes.children.push(thirdlvlNodes);
            }

            root.children.push(secondlvlNodes);
        }

        return root;
    }

    function collapse(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
        }
    }

    function update(source) {
        // Compute the new tree layout.
        var nodes = tree.nodes(root).reverse(),
            links = tree.links(nodes);

        // Normalize for fixed-depth.
        nodes.forEach(function(d) {
            d.y = d.depth * DEPTH_FACTOR;
        });

        // Update the nodes…
        var node = svg.selectAll("g.node")
            .data(nodes, function(d) {
                return d.id || (d.id = ++i);
            });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .attr("transform", function(d) {
                return "translate(" + source.y0 + "," + source.x0 + ")";
            })
            .on("click", click);

        nodeEnter.append("circle")
            .attr("r", 1e-6)
            .style("fill", function(d) {
                return d._children ? "lightsteelblue" : "#fff";
            });

        // node label
        nodeEnter.append("text")
            .attr("x", function(d) {
                //return d.children || d._children ? -10 : 10;
                return -8;
            })
            .attr("y", function(d) {
                return 2;
            })
            // .attr("dy", ".35em")
            .attr("text-anchor", function(d) {
                //return d.children || d._children ? "end" : "start";
                return "end"
            })
            .text(function(d) {
                return d.name;
            })
            .style("fill-opacity", 1e-6);

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
            .duration(DURATION)
            .attr("transform", function(d) {
                return "translate(" + d.y + "," + d.x + ")";
            });

        nodeUpdate.select("circle")
            .attr("r", 4.5)
            .style("fill", function(d) {
                return d._children ? "lightsteelblue" : "#fff";
            });

        nodeUpdate.select("text")
            .style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
            .duration(DURATION)
            .attr("transform", function(d) {
                return "translate(" + source.y + "," + source.x + ")";
            })
            .remove();

        nodeExit.select("circle")
            .attr("r", 1e-6);

        nodeExit.select("text")
            .style("fill-opacity", 1e-6);

        // Update the links…
        var link = svg.selectAll("path.link")
            .data(links, function(d) {
                return d.target.id;
            });

        // Enter any new links at the parent's previous position.
        link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("d", function(d) {
                var o = {
                    x: source.x0,
                    y: source.y0
                };
                return diagonal({
                    source: o,
                    target: o
                });
            });

        // Transition links to their new position.
        link.transition()
            .duration(DURATION)
            .attr("d", diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(DURATION)
            .attr("d", function(d) {
                var o = {
                    x: source.x,
                    y: source.y
                };
                return diagonal({
                    source: o,
                    target: o
                });
            })
            .remove();

        // Stash the old positions for transition.
        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    function expand(d){
        var children = (d.children)?d.children:d._children;

        if (d._children) {
            d.children = d._children;
            d._children = null;
        }

        if(children) children.forEach(expand);
    }

    function expandAll() {
        expand(root);
        update(root);
    }

    // Toggle children on click.
    function click(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
        }

        update(d);
    }

    function getNewId() {
        nid++;
        return nid;
    }
});

//Redraw for zoom
function redraw() {
    //console.log("here", d3.event.translate, d3.event.scale);
    svg.attr("transform",
        "translate(" + d3.event.translate + ")" +
        " scale(" + d3.event.scale + ")");
}
