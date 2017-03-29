/* Simple Tree : http://bl.ocks.org/d3noob/8323795 */
// ************** Generate the tree diagram	 *****************
var filePath = "data/full.json";

var margin = {top: 20, right: 120, bottom: 20, left: 120},
	width = 960 - margin.right - margin.left,
	height = 500 - margin.top - margin.bottom;

var i = 0;

var tree = d3.layout.tree()
	.size([height, width]);

var diagonal = d3.svg.diagonal()
	.projection(function(d) { return [d.y, d.x]; });

var svg = d3.select("body").append("svg")
	.attr("width", width + margin.right + margin.left)
	.attr("height", height + margin.top + margin.bottom)
  	.append("g")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var nid = 1; // node id
var relationships = {};

d3.json(filePath, function(error, data) {
	if (error) throw error;

	root = {
        "name": "root",
        "children": []
    };

    root = processData(data);

	update(root);

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

	function getNewId() {
        nid++;
        return nid;
    }

	function update(source) {

	  // Compute the new tree layout.
	  var nodes = tree.nodes(root).reverse(),
		  links = tree.links(nodes);

	  // Normalize for fixed-depth.
	  nodes.forEach(function(d) { d.y = d.depth * 180; });

	  // Declare the nodes…
	  var node = svg.selectAll("g.node")
		  .data(nodes, function(d) { return d.id || (d.id = ++i); });

	  // Enter the nodes.
	  var nodeEnter = node.enter().append("g")
		  .attr("class", "node")
		  .attr("transform", function(d) {
			  return "translate(" + d.y + "," + d.x + ")"; });

	  nodeEnter.append("circle")
		  .attr("r", 4.5)
		  .style("fill", "#fff");

	  nodeEnter.append("text")
		  .attr("x", function(d) {
			  return d.children || d._children ? -13 : 13; })
		  .attr("dy", ".35em")
		  .attr("text-anchor", function(d) {
			  return d.children || d._children ? "end" : "start"; })
		  .text(function(d) { return d.name; })
		  .style("fill-opacity", 1);

	  // Declare the links…
	  var link = svg.selectAll("path.link")
		  .data(links, function(d) { return d.target.id; });

	  // Enter the links.
	  link.enter().insert("path", "g")
		  .attr("class", "link")
		  .attr("d", diagonal);
	}
});
