/* This script will be executed once page is loaded */
var filePath = "data/full.json";

/* Original Code: https://bl.ocks.org/mbostock/4339083 */
/* Zoom: http://jsfiddle.net/augburto/YMa2y/ */
/* Initial config */

const DEPTH_FACTOR = 200; // link distance
const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;
const DURATION = 400;
const ZOOM_MAX = 8;
const SIDE_X = 900;
const SIDE_Y = 100;
const SIDE_VERT_DIST = 20;

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

var c10 = d3.scale.category10();

var svg = d3.select("body").append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom)
    .call(zm = d3.behavior.zoom().scaleExtent([1,ZOOM_MAX]).on("zoom", redraw)) // zoom
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
    ;

//necessary so that zoom knows where to zoom and unzoom from
zm.translate([350, 20]);

var nid = 1; // node id
var aid = 1; // attribute node id
var relationships = {};

var sideLinks = [];

var attrOptions = [];
var selectedAttr = "";

d3.json(filePath, function(error, data) {
    if (error) throw error;

    // initialize attribute options
    var firstEle = data[0].children[0].children[0];

    for (var ele in firstEle) {
        if (ele !== "name") {
            attrOptions.push(ele);
        }
    }

    if (attrOptions.length > 0) {
        selectedAttr = attrOptions[0];
    }

    // init UI
    var select = d3.select('body')
        .append('select')
        .attr('class','select ui-options')
        .on('change',onchange);

    var options = select
        .selectAll('option')
        .data(attrOptions).enter()
        .append('option')
        .text(function (d) { return d; });

    function onchange() {
        selectedAttr = d3.select('select').property('value')
        expandAll(selectedAttr);
    };

    root = {
        "name": "Comparative Toolsets",
        "children": []
    };

    root = processData(data);
    root.x0 = height / 2;
    root.y0 = 0;

    expandAll(selectedAttr);

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

        // generate dropdown options
        attrOptions = Object.keys(relationships);

        // console.log(hierarchy);
        // console.log(relationships);

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

    /*
        Node (leaf)
        {
            id
            depth
            name
            nid
            parent:{}
            x
            y
        }
    */
    function update(source, attr) {
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
            // .attr("transform", function(d) {
            //     return "translate(" + source.y0 + "," + source.x0 + ")";
            // })
            .on("mouseover", nodeMouseover)
            .on("click", nodeClick)
            .on("mouseout", mouseout)
            ;

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
        var nodeUpdate = node
            // .transition()
            // .duration(DURATION)
            .attr("transform", function(d) {
                return "translate(" + d.y + "," + d.x + ")";
            })
            ;

        nodeUpdate.select("circle")
            .attr("r", 4.5)
            .style("fill", function(d) {
                return d._children ? "lightsteelblue" : "#fff";
            });

        nodeUpdate.select("text")
            .style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit()
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
        link
            .attr("d", diagonal);

        /* Render nodes of taxonomy attributes from relationships */
        // select the first attribute by default
        buildSideGraphData(nodes, attr);

        if (sideLinks.length > 0) {
            // highlight nodes without any connections
            svg.selectAll(".node").classed("noLink", function(d){
                return !sideLinks.find(function(l) {
                    return d.name === l.source.name;
                }) && (!d.children);
            });

            renderSideGraph(nodes, sideLinks);
        }
    }

    function resetSideGraph() {
        d3.selectAll(".sideLink").remove();
        d3.selectAll(".sideNode").remove();
        sideLinks = [];
    }

    // construct node-link data for the relationships between software and attributes
    // nodes are from existing tree
    function buildSideGraphData(nodes, attr) {
        // console.log(nodes);

        var selectedGroup = relationships[attr];

        // generate nodes for selected attribute
        var sideNodeNames = Object.keys(selectedGroup);

        // sort in natural order
        sideNodeNames.sort(function(a, b) {
            // return naturalSort(a, b, { insensitive: true });
            return selectedGroup[b].length - selectedGroup[a].length;
        });

        var startY = SIDE_Y;

        for (var i in sideNodeNames) {
            startY += SIDE_VERT_DIST;
            var sideNode = {
                name: sideNodeNames[i],
                aid: aid++,
                type: "attribute",
                x: SIDE_X,
                y: startY
            };

            nodes.push(sideNode);
        }

        // generate links for selected attribute
        // source: names of nodes that are of type attribute
        // target: id of software
        for (var key in selectedGroup) {
            var targetNode = nodes.find(function(d) {
                return (d.name === key) && (d.type === "attribute");
            });

            for (var j in selectedGroup[key]) {
                var sourceNode = nodes.find(function(d) {
                    return d.nid === selectedGroup[key][j];
                });

                var link = {
                    // source: key,
                    // target: selectedGroup[key][j]
                    source: sourceNode,
                    target: targetNode
                };

                sideLinks.push(link);
            }
        }
    }

    function renderSideGraph(nodes, links) {
        resetSideGraph();

        var sideGraphData = nodes.filter(function(d) {
            return d.type === "attribute";
        });

        // construct nodes
        var sideNode = svg.selectAll("g.sideNode")
            .data(sideGraphData);

        var sideNodeEnter = sideNode.enter().append("g");

        sideNodeEnter.attr("class", "sideNode")
            .on("mouseover", sideNodeMouseover)
            .on("click", sideNodeClick)
            .on("mouseout", mouseout)
            .append("circle")
            .attr("cx", function(d) {
                return d.x
            })
            .attr("cy", function(d) {
                return d.y
            })
            .attr("r", 6)
            .attr("fill", function(d, i) {
                return "#fff";
            });

        sideNodeEnter.append("text")
            .attr("x", function(d) {
                //return d.children || d._children ? -10 : 10;
                return d.x+12;
            })
            .attr("y", function(d) {
                return d.y+4;
            })
            .attr("text-anchor", function(d) {
                //return d.children || d._children ? "end" : "start";
                return "start"
            })
            .text(function(d) {
                return d.name;
            })
            ;

        // draw links
        var sideLink = svg.selectAll("link")
            .data(links);

        var sideLinkEnter = sideLink.enter()
            .append("line");

        sideLinkEnter.attr("class", "sideLink")
            .attr("x1", function(l) {
                // the source x is actually y, y is x
                d3.select(this).attr("y1", l.source.x);
                return l.source.y;
            })
            .attr("x2", function(l) {
                d3.select(this).attr("y2", l.target.y);
                return l.target.x;
            })
            .on("mouseover", sideLinkMouseover)
            .on("click", sideLinkClick)
            .on("mouseout", mouseout)
            ;
    }

    /* Mouse Event */
    function resetSelection() {
        svg.selectAll(".node").classed("selected", false);
        svg.selectAll(".sideNode").classed("selected", false);
        svg.selectAll(".sideLink").classed("selected", false);
    }

    /* Events for leafs of the tree (software) */
    function nodeMouseover(d) {
        // if (d.children) {
        //     for (var childIndex in d.children) {
        //         // if it's a leaf
        //         if (!d.children[childIndex].children) {
        //             nodeMouseover(d.children[childIndex]);
        //         }
        //     }
        // }

        svg.selectAll(".sideLink").classed("active", function(p) {
            return p.source.name === d.name;
        });
        d3.select(this).classed("active", true);
    }

    function nodeClick(d) {
        resetSelection();
        svg.selectAll(".sideLink").classed("selected", function(p) {
            return p.source.name === d.name;
        });
        d3.select(this).classed("selected", true);
    }

    /* Events for side nodes (attribute) */
    function sideNodeMouseover(d) {
        svg.selectAll(".sideLink").classed("active", function(p) {
            return p.target.name === d.name;
        });
        d3.select(this).classed("active", true);
    }

    function sideNodeClick(d) {
        resetSelection();
        svg.selectAll(".sideLink").classed("selected", function(p) {
            return p.target.name === d.name;
        });
        d3.select(this).classed("selected", true);
    }

    /* Events for links between software and attribute nodes */
    function sideLinkMouseover(d) {
        svg.selectAll(".sideLink")
            .classed("active", function(p) {
                return p === d;
            });
        svg.selectAll(".node")
                .classed("active", function(p) {
                return (p.name === d.source.name) || (p.name === d.target.name);
            });

        svg.selectAll(".sideNode")
                .classed("active", function(p) {
                return (p.name === d.source.name) || (p.name === d.target.name);
            });
    }

    function sideLinkClick(d) {
        svg.selectAll(".sideLink")
            .classed("selected", function(p) {
                return p === d;
            });
        svg.selectAll(".node")
                .classed("selected", function(p) {
                return (p.name === d.source.name) || (p.name === d.target.name);
            });

        svg.selectAll(".sideNode")
                .classed("selected", function(p) {
                return (p.name === d.source.name) || (p.name === d.target.name);
            });
    }

    function mouseout(d) {
        svg.selectAll(".active").classed("active", false);
    }

    function expand(d){
        var children = (d.children)?d.children:d._children;

        if (d._children) {
            d.children = d._children;
            d._children = null;
        }

        if(children) children.forEach(expand);
    }

    function expandAll(attr) {
        expand(root);
        update(root, attr);
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

/*
 * Natural Sort algorithm for Javascript - Version 0.8.1 - Released under MIT license
 * Author: Jim Palmer (based on chunking idea from Dave Koelle)
 */
naturalSort = function (a, b) {
    var re = /(^([+\-]?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?(?=\D|\s|$))|^0x[\da-fA-F]+$|\d+)/g,
        sre = /^\s+|\s+$/g,   // trim pre-post whitespace
        snre = /\s+/g,        // normalize all whitespace to single ' ' character
        dre = /(^([\w ]+,?[\w ]+)?[\w ]+,?[\w ]+\d+:\d+(:\d+)?[\w ]?|^\d{1,4}[\/\-]\d{1,4}[\/\-]\d{1,4}|^\w+, \w+ \d+, \d{4})/,
        hre = /^0x[0-9a-f]+$/i,
        ore = /^0/,
        i = function(s) {
            return (naturalSort.insensitive && ('' + s).toLowerCase() || '' + s).replace(sre, '');
        },
        // convert all to strings strip whitespace
        x = i(a),
        y = i(b),
        // chunk/tokenize
        xN = x.replace(re, '\0$1\0').replace(/\0$/,'').replace(/^\0/,'').split('\0'),
        yN = y.replace(re, '\0$1\0').replace(/\0$/,'').replace(/^\0/,'').split('\0'),
        // numeric, hex or date detection
        xD = parseInt(x.match(hre), 16) || (xN.length !== 1 && Date.parse(x)),
        yD = parseInt(y.match(hre), 16) || xD && y.match(dre) && Date.parse(y) || null,
        normChunk = function(s, l) {
            // normalize spaces; find floats not starting with '0', string or 0 if not defined (Clint Priest)
            return (!s.match(ore) || l == 1) && parseFloat(s) || s.replace(snre, ' ').replace(sre, '') || 0;
        },
        oFxNcL, oFyNcL;
    // first try and sort Hex codes or Dates
    if (yD) {
        if (xD < yD) { return -1; }
        else if (xD > yD) { return 1; }
    }
    // natural sorting through split numeric strings and default strings
    for(var cLoc = 0, xNl = xN.length, yNl = yN.length, numS = Math.max(xNl, yNl); cLoc < numS; cLoc++) {
        oFxNcL = normChunk(xN[cLoc] || '', xNl);
        oFyNcL = normChunk(yN[cLoc] || '', yNl);
        // handle numeric vs string comparison - number < string - (Kyle Adams)
        if (isNaN(oFxNcL) !== isNaN(oFyNcL)) {
            return isNaN(oFxNcL) ? 1 : -1;
        }
        // if unicode use locale comparison
        if (/[^\x00-\x80]/.test(oFxNcL + oFyNcL) && oFxNcL.localeCompare) {
            var comp = oFxNcL.localeCompare(oFyNcL);
            return comp / Math.abs(comp);
        }
        if (oFxNcL < oFyNcL) { return -1; }
        else if (oFxNcL > oFyNcL) { return 1; }
    }
}
