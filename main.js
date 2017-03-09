/* This script will be executed once page is loaded */
// html element that holds the chart
var graph_container;

/* data loading */
var dataMap = d3.map();
dataMap.set("2012", "testdata/2012.json");
dataMap.set("2016", "testdata/2016.json");

var currYear="2016";
var currContract="all";
var currSchool = {};

var cachedData = {};

var isRelationshipView = false;

/* d3 initialization */
// reset DOM
d3.select("#graph").selectAll("*").remove();
var width = 0;
var height = 0;
var svg = null;
var simulation = null;

var radius = d3.scaleSqrt()
    .range([0, 1.5]);

var nodeLinkRadius = d3.scaleSqrt()
    .range([0, 1.2]);

const MIN_RADIUS = 5;
const MAX_RADIUS = radius(3000);

var donutRadius = d3.scaleSqrt() // radius for donuts
    .range([0, 60]);

var circleScale = d3.scaleSqrt().range([0, 20]); // for pie

var color = d3.scaleOrdinal()
    .range(["#8ed8f8", "#00bfff", "#005baa"]);

const PIE_COLOR = {
    bilateral: '#8ed8f8',
    multilateral: '#00bfff',
    system: '#005baa'
};

const LEG_TEXT = {
    bilateral: "Bi-lateral Agreements",
    multilateral: "Multi-lateral Agreements",
    system: "System Agreements"
}

const ZOOM_ON = false;

const NODE_LINK_W = 1400;
const NODE_LINK_H = 1000;

/* Simulation parameters */
const CHARGE_STR = -3000;
const LINK_DIST = 120;

/* For calculating force starting position */
const W_FACTOR = 2.5; // width factor
const H_FACTOR = 2; // height factor
const PIE_W_FACTOR = 2.8;
const PIE_H_FACTOR = 1.8;

/* Legend dimensions */
const LEGEND_BOX_W = 400;
const LEGEND_BOX_H = 120;
const SOLID_W = 60;
const SOLID_H = 18;
const HEATMAP_W = 60;
const HEATMAP_H = 20;

var arc = d3.arc();

var pie = d3.pie()
    .sort(null)
    .padAngle(0.02)
    .startAngle(1.1 * Math.PI)
    .endAngle(3.1 * Math.PI)
    .value(function(d) {
        return d.count;
    });

/* Zoom */
var min_zoom = 0.1;
var max_zoom = 7;
var zoomScale = d3.zoom().scaleExtent([min_zoom,max_zoom]);

/* materialcss init */
$('select').material_select(); //Materialize.css setup
$(".button-collapse").sideNav({menuWidth:240});
graph_container = d3.selectAll("#graph_container")
    .style("width", "screenWidth" + "px")
    .style("height","screenHeight" + "px");

/* Fix back button */
var topOffset = parseInt($("#backBtn").css('top'));
var leftOffset = parseInt($("#backBtn").css('left'));
$(window).scroll(function(){
    $('#backBtn').css({
        'top': $(this).scrollTop() + topOffset
    });

    $('#backBtn').css({
        'left': $(this).scrollLeft() + leftOffset
    });
});

$(window).resize(function() {
    windowResize();
});

renderChart("2016", "", isRelationshipView);

setTimeout(windowResize, 50);

function windowResize() {
    var availHeight = window.innerHeight - $('#graph').outerHeight(true);
    var availWidth = window.innerWidth - $('#slide-out').outerWidth();

    var graphWidth = $('#graph').outerWidth();
    var graphHeight = $('#graph').outerHeight();

    var scaleFactor = 1;

    scaleFactor = Math.min(
        availWidth/graphWidth,
        availHeight/graphHeight
    );

    if (scaleFactor !== 1) {
        // $('#graph').css("transform", "translate(-50%, -50%) scale(" + scaleFactor + ")");
    }
}

/*
For filtering year
*/
function updateData(year) {
    // change data set
    if (year !== currYear) {
        currYear=year;

        if (currContract != "all") {
            renderChart(year,currContract,isRelationshipView);
        } else {
            renderChart(year,"",isRelationshipView);
        }
    }
}

/*
For filtering contract type
*/
function updateContract(contract) {
    currContract=contract;
    renderChart("",contract, isRelationshipView);
}

function resumeMainView() {
    $('#backBtn').css("visibility", "hidden");

    isRelationshipView = false;

    if (cachedData) {
        renderReset();
        renderChart("", currContract, isRelationshipView)
        // renderMultipleDonutView(cachedData);
    }
}

/* Erase graph */
function renderReset() {
    d3.select("#graph").selectAll("*").remove();
    // d3.select("#graph_container").select("#chart").selectAll("*").remove();
    d3.select(".legendBox").selectAll("*").remove();
}

/* Render visualization based on the filter values */
function renderChart(year, contract, isRelationshipView) {
    if (year) { // filter by year
        if (contract) {
            // render multiple pie
            d3.json(dataMap.get(year), function(error, data) {
                if (error) throw error;

                cachedData = data;

                renderReset();

                if (isRelationshipView) {
                    renderRelationshipView(currSchool, cachedData);
                } else {
                    renderMultiplePieView(contract, cachedData);
                }
            });
        } else {
            d3.json(dataMap.get(year), function(error, data) {
                if (error) throw error;

                cachedData = data;

                renderReset();

                if (isRelationshipView) {
                    renderRelationshipView(currSchool, cachedData);
                } else {
                    renderMultipleDonutView(cachedData);
                }
            });
        }
    } else { // filter by contract
        if (contract && cachedData) {
            renderReset();

            if (contract === "all") {
                if (isRelationshipView) {
                    renderRelationshipView(currSchool, cachedData);
                } else {
                    renderMultipleDonutView(cachedData);
                }
            } else {
                if (isRelationshipView) {
                    renderRelationshipView(currSchool, cachedData);
                } else {
                    renderMultiplePieView(contract, cachedData);
                }
            }
        }
    }
}

function donutInfo(d) {
    var type = d.type;

    var label = d3.select("#institution-info")
        .append("p")
        .attr("id", "school-title")
        .text(d.id)
        .append("p")
        .attr("id", "school-data")
        .text("Total " + type + " agreements: " + d.size);
}

function pieInfo(d) {
    var type = d.type;

    var label = d3.select("#institution-info")
        .append("p")
        .attr("id", "school-title")
        .text(d.id)
        .append("p")
        .attr("id", "school-data")
        .text("Total " + type + " agreements: " + d.count);
}

function removeInfo() {
    d3.select("#institution-info").selectAll("*").remove();
}

/* Get the number of contract based on filter value */
function getContractCount(d, modifier) {
    var result = d.paths.find((val) => {
        return val.type === modifier;
    });

    return result ? result.count : 0;
}

/* Render multiple donut chart (main view) */
function renderMultipleDonutView(data) {
    isRelationshipView = false;

    var nodes = data.nodes;
    var sendingNodes = nodes[0].sending;
    var receivingNodes = nodes[0].receiving;

    var sendingMax = d3.max(sendingNodes, function(d) {
        return d.size;
    });

    donutRadius.domain([0, sendingMax]);

    color.domain(sendingNodes);

    var chart = d3.select("#graph_container").select("#graph")
        // .attr("width", '100%')
        // .attr("height", '100%')
        // .attr('viewBox','0 0 '+Math.min(width,height) +' '+Math.min(width,height) )
        // .attr('preserveAspectRatio','xMinYMin')
        // .append("g")
        // .attr("transform", "translate(" + Math.min(width,height) / 2 + "," + Math.min(width,height) / 2 + ")")
        ;

    var svg = chart.selectAll(".pie")
        .data(sendingNodes.sort(function(a, b) {
            return b.size - a.size;
        }))
        .enter().append("svg")
        .attr("class", "pie")
        .each(multiple)
        .on("mouseover", donutInfo)
        .on("mouseout", removeInfo)
        .on("click", showRelationship)
        .select("g");

    var legend = d3.select(".legendBox").append("svg")
        .attr("class", "legend")
        .attr("width", LEGEND_BOX_W)
        .attr("height", LEGEND_BOX_H)
        .selectAll("g")
        .data(sendingNodes[0].paths)
        .enter().append("g")
        .attr("transform", function(d, i) {
            return "translate(0," + i * 20 + ")";
        });

    legend.append("rect")
        .attr("width", SOLID_W)
        .attr("height", SOLID_H)
        .style("fill", function(d) {
            return color(d.type);
        });

    legend.append("text")
        .attr("x", SOLID_W+8)
        .attr("y", 9)
        .attr("dy", ".35em")
        .text(function(d) {
            return LEG_TEXT[d.type];
        });

    function multiple(d) {
        var outerRadius = donutRadius(d.size);
        var innerRadius = outerRadius * 0.7;
        var svg = d3.select(this)
            .attr("width", outerRadius * 2)
            .attr("height", outerRadius * 2)
            .attr("margin", "10px")
            .append("g")
            .attr("transform", "translate(" + outerRadius + "," + outerRadius + ")");

        var g = svg.selectAll(".arc")
            .data(function(d) {
                return pie(d.paths);
            })
            .enter().append("g")
            .attr("class", "arc")
            .attr("id", function(d, i) {
                return "path" + d.data.type + i; // path name
            })
            .on("mouseover", ring)
            .on("mouseout", function(d) {
                svg.select(".ArcLabel").remove();
            });


        var path = g.append("path")
            .attr("d", arc.outerRadius(outerRadius).innerRadius(innerRadius))
            .attr("fill", function(d) {
                return color(d.data.type);
            })
            .style("padding", "10px");

        function ring(d) {
            var a = d.data.type;
            var b = d.data.count;
            // console.log(this);

            var ArcLabel = d3.select(this)
                .append("text")
                .attr("x", 6)
                .attr("dy", "20px")
                .append("textPath")
                .attr("class", "ArcLabel")
                .attr("text-anchor", "middle")
                .style("stroke", "#000")
                .attr("xlink:href", function(d, i) {
                    return "path" + d.data.type + i;
                })
                .text(function(d) {
                    return d.data.type;
                });

            var ringPath = d3.select(this)
                .each(function(d) {
                    d.outerRadius = outerRadius - 20;
                })
                .attr("d", arc)
                .on("mouseover", arcTween(outerRadius, 0))
                .on("mouseout", arcTween(outerRadius - 20, 150));

            function arcTween(outerRadius, delay) {
                return function() {
                    d3.select(this).transition().delay(delay).attrTween("d", function(d) {
                        var i = d3.interpolate(d.outerRadius, outerRadius);
                        return function(t) {
                            d.outerRadius = i(t);
                            return arc(d);
                        };
                    });
                };
            }
        }
    }
}

/* Render multiple pie chart */
function renderMultiplePieView(modifier, data) {
    isRelationshipView = false;

    if ((currContract === "system") && (currYear === "2012")) {
        // TODO: add some error message
        return;
    }

    var pieData = [];

    data.nodes[0].sending.forEach((d) => {
        pieData.push({
            id: d.id,
            count: getContractCount(d, modifier),
            type: "sending"
        });
    });

    var chart = d3.select("#graph_container").select("#graph");

    var chart = chart.selectAll(".pie")
        .data(pieData.sort(function(a, b) {
            return b.count - a.count;
        }))
        .enter().append("svg")
        .attr("class", "pie")
        .each(multiple)
        .on("mouseover", pieInfo)
        .on("mouseout", removeInfo)
        .on("click", showRelationship)
        .select("g");

    function multiple(d) {
        circleScale.domain([0, d3.max(pieData, function(d) {
            return d.count;
        })]);

        var r = radius(d.count);

        var svg = d3.select(this)
            .attr("width", r * 2)
            .attr("height", r * 2)
            .append("circle")
            .attr("transform", "translate(" + r + "," + r + ")")
            .attr("class", "circle")
            .attr("r", r)
            .style("fill", PIE_COLOR[modifier]);
    }
}

function showRelationship(d) {
    //   console.log(d.id);

    removeInfo();

    currSchool = d.id; // preserve node info for applying filters

    if (cachedData) {
        $('#backBtn').css("visibility", "visible").css("background-color", "#8ed8f8")

        renderReset();

        renderRelationshipView(d.id, cachedData);
    }
}

function renderRelationshipView(school, graph) {
    isRelationshipView = true;

    width = NODE_LINK_W;
    height = NODE_LINK_H;

    svg = d3.select("#graph")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        ;

    if (currContract === "all") {
        renderNodeLinkDonut(school, graph);
    } else {
        renderNodeLinkPie(school, graph);
    }
}

function renderNodeLinkDonut(school, graph) {
    simulation = d3.forceSimulation()
        .force("charge", d3.forceManyBody().strength(CHARGE_STR))
        // .force("collide", d3.forceCollide(function(d) {
        //     return 8;
        // }).iterations(4))
        .force("link", d3.forceLink().id(function(d) {
            return d.id;
        }).distance(LINK_DIST))
        .force("center", d3.forceCenter(width / W_FACTOR, height / H_FACTOR))
        .alpha(0.6);

    if (!school) return;

    // deep copy graph data
    var nodes = [];
    var links = [];

    graph.links.forEach(function(l) {
        if (l.source === school) links.push(clone(l));
    });

    links.forEach(function(l) {
        // get all receiving data
        var target = graph.nodes[0].receiving.find(function(n) {
            return l.target === n.id;
        });

        if (target) {
            nodes.push(clone(target));
        }
    });

    // get the sending school's data
    graph.nodes[0].sending.forEach(function(n) {
        if (n.id === school) nodes.push(clone(n));
    });

    var legend = d3.select(".legendBox").append("svg")
        .attr("class", "legend")
        .attr("width", LEGEND_BOX_W)
        .attr("height", LEGEND_BOX_H)
        .selectAll("g")
        .data(nodes[0].paths)
        .enter().append("g")
        .attr("transform", function(d, i) {
            return "translate(0," + i * 20 + ")";
        });

    legend.append("rect")
        .attr("width", SOLID_W)
        .attr("height", SOLID_H)
        .style("fill", function(d) {
            return color(d.type);
        });

    legend.append("text")
        .attr("x", SOLID_W+8)
        .attr("y", 9)
        .attr("dy", ".35em")
        .text(function(d) {
            return LEG_TEXT[d.type];
        });

    var heatMap = d3.select(".legendBox").select(".legend")
        .append("g")
        .attr("id", "heatmap")
        .attr("transform", "translate(0," + 80 + ")")
        ;
    // legend for links
    var lg = heatMap.append('linearGradient')
        .attr('id', 'Gradient2')
        .attr('x1', 1)
        .attr('x2', 0)
        .attr('y1', 0)
        .attr('y2', 0);

    lg.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#660066');

    lg.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#f7e6f7');

    heatMap.append('rect')
        .attr('x', 0)
        .attr('y', 9)
        .attr('width', HEATMAP_W)
        .attr('height', HEATMAP_H)
        .style("fill", "url(#Gradient2)");

    // add text for legend title
    heatMap.append("text")
        .attr("x", HEATMAP_W+8)
        .attr("y", HEATMAP_H)
        .attr("dy", ".35em")
        .text("Number of Agreements");

    // add text for min value
    heatMap.append("text")
        .attr("x", 6)
        .attr("y", 0)
        .attr("dy", ".35em")
        .style("text-anchor", "middle")
        .text("0");

    var hmMax = d3.max(links.map(function(d) {
        return d.total;
    }));

    // add text for max value
    heatMap.append("text")
        .attr("x", HEATMAP_W)
        .attr("y", 0)
        .attr("dy", ".35em")
        .style("text-anchor", "middle")
        .text(hmMax);

    var link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(links)
        .enter().append("line")
        .style("stroke", "#660066")
        .style("stroke-width", "8px")
        .style("opacity", function(d) {
            return d.total * 0.05
        });

    var node = svg.append("g")
        .attr("class", "nodes")
        .selectAll(".nodes")
        .data(nodes)
        .enter().append("g")
        .each(multiple)
        .on("mouseover", donutInfo)
        .on("mouseout", removeInfo)
        ;

    // center white circle
    node.append("circle")
        .attr("r", function(d) {
            return nodeLinkRadius(d.size * 0.55);
        })
        .attr("fill", "#fff")
        ;

    if (ZOOM_ON) {
        d3.select("#graph").select("svg").append("rect") // zoom box
            .attr("width", width)
            .attr("height", height)
            .style("fill", "none")
            .style("pointer-events", "all")
            .call(zoomScale.on("zoom", function() {
                d3.select("#graph").select("svg").select("g")
                    .attr("transform", d3.event.transform)
                    ;
            })) // enable zoom
            ;
    }

    // center label
    // var label = node.append("text")
    //     .attr("class", "label");
    //
    // label.append("tspan")
    //     .attr("class", "label-name")
    //     .attr("x", -20)
    //     .attr("dy", "-.2em")
    //     .text(function(d) {
    //         if (d.id == school) return d.id
    //     });
    //
    // label.append("tspan")
    //     .attr("class", "label-value")
    //     .attr("x", -20)
    //     .attr("dy", "1.1em")
    //     .text(function(d) {
    //         if (d.id == school) return d.size
    //     });

    function multiple(d) {
        var outerRadius = nodeLinkRadius(d.size);

        if (outerRadius <= MIN_RADIUS) {
            outerRadius = MIN_RADIUS;
        }

        var innerRadius = outerRadius * 0.7;

        var subsvg = d3.select(this)
            .attr("width", outerRadius * 2)
            .attr("height", outerRadius * 2)
            .attr("margin", "10px")
            .append("g");

        var g = subsvg.selectAll(".arc")
            .data(function(d) {
                return pie(d.paths);
            })
            .enter().append("g")
            .attr("class", "arc")
            .attr("id", function(d, i) {
                return "path" + d.data.type + i;
            })
            ;

        var path = g.append("path")
            .attr("d", arc.outerRadius(outerRadius).innerRadius(innerRadius).padAngle(0.03))
            .attr("fill", function(d) {
                return color(d.data.type);
            })
            .style("padding", "10px");
    }

    simulation
        .nodes(nodes)
        .on("tick", ticked);
    simulation
        .force("link")
        .links(links);

    function ticked() {
        link.attr("x1", function(d) {
                return d.source.x;
            })
            .attr("y1", function(d) {
                return d.source.y;
            })
            .attr("x2", function(d) {
                return d.target.x;
            })
            .attr("y2", function(d) {
                return d.target.y;
            });

        node.attr("cx", function(d) {
                return d.x;
            })
            .attr("cy", function(d) {
                return d.y;
            })
            .attr("transform", function(d) {
                return "translate(" + d.x + "," + d.y + ")"
            });
    }

    // free memory
    nodes = null;
    links = null;
}

function renderNodeLinkPie(school, graph) {
    if ((currContract === "system") && (currYear === "2012")) {
        // TODO: add some error message
        return;
    }

    simulation = d3.forceSimulation()
        .force("charge", d3.forceManyBody().strength(CHARGE_STR))
        // .force("collide", d3.forceCollide(function(d) {
        //     return 50;
        // }).iterations(20))
        .force("link", d3.forceLink().id(function(d) {
            return d.id;
        }).distance(LINK_DIST))
        .force("center", d3.forceCenter(width / PIE_W_FACTOR, height / PIE_H_FACTOR))
        .alpha(0.6);

    if (!school) return;

    // deep copy graph data
    var nodes = [];
    var links = [];

    graph.links.forEach(function(l) {
        if (l.source === school) {
            if (currContract !== "all") {
                if (l[currContract] !== 0) links.push(clone(l));
            } else {
                links.push(clone(l));
            }
        }
    });

    links.forEach(function(l) {
        var target = graph.nodes[0].receiving.find(function(n) {
            return l.target === n.id;
        });

        if (target) {
            nodes.push({
                id: target.id,
                count: getContractCount(target, currContract),
                type: "receiving"
            });
        }
    });

    graph.nodes[0].sending.forEach(function(n) {
        if (n.id === school) {
            nodes.push({
                id: n.id,
                count: getContractCount(n, currContract),
                type: "sending"
            });
        }
    });

    var legend = d3.select(".legendBox").append("svg")
        .attr("class", "legend")
        .attr("width", LEGEND_BOX_W)
        .attr("height", LEGEND_BOX_H)
        ;

    var heatMap = d3.select(".legendBox").select(".legend")
        .append("g")
        .attr("id", "heatmap")
        .attr("transform", "translate(0," + 80 + ")")
        ;
    // legend for links
    var lg = heatMap.append('linearGradient')
        .attr('id', 'Gradient2')
        .attr('x1', 1)
        .attr('x2', 0)
        .attr('y1', 0)
        .attr('y2', 0);

    lg.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#660066');

    lg.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#f7e6f7');

    heatMap.append('rect')
        .attr('x', 0)
        .attr('y', 9)
        .attr('width', HEATMAP_W)
        .attr('height', HEATMAP_H)
        .style("fill", "url(#Gradient2)");

    // add text for legend title
    heatMap.append("text")
        .attr("x", HEATMAP_W+8)
        .attr("y", HEATMAP_H)
        .attr("dy", ".35em")
        .text("Number of Agreements");

    // add text for min value
    heatMap.append("text")
        .attr("x", 6)
        .attr("y", 0)
        .attr("dy", ".35em")
        .style("text-anchor", "middle")
        .text("0");

    var hmMax = d3.max(links.map(function(d) {
        return d[currContract];
    }));

    // add text for max value
    heatMap.append("text")
        .attr("x", HEATMAP_W)
        .attr("y", 0)
        .attr("dy", ".35em")
        .style("text-anchor", "middle")
        .text(hmMax);

    var link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(links)
        .enter().append("line")
        .style("stroke", "#660066")
        .style("stroke-width", "8px")
        .style("opacity", function(d) {
            return d.total * 0.05
        });

    var node = svg
        .append("g")
        .attr("class", "nodes")
        .selectAll(".nodes")
        .data(nodes)
        .enter().append("g")
        .each(multiple)
        .on("mouseover", pieInfo)
        .on("mouseout", removeInfo)
        ;

    function multiple(d) {
        var maxVal = d3.max(nodes, function(d) {
            return d.count;
        });

        circleScale.domain([0, maxVal]);

        var r = radius(d.count);

        if (r <= MIN_RADIUS) {
            r = MIN_RADIUS;
        }

        r = Math.min(r, MAX_RADIUS);

        var subsvg = d3.select(this)
            .attr("width", r * 2)
            .attr("height", r * 2)
            .append("circle")
            .attr("class", "pie")
            .attr("r", r)
            .style("fill", PIE_COLOR[currContract])
            ;
    }

    simulation
        .nodes(nodes)
        .on("tick", ticked);
    simulation
        .force("link")
        .links(links);

    function ticked() {
        link.attr("x1", function(d) {
                return d.source.x;
            })
            .attr("y1", function(d) {
                return d.source.y;
            })
            .attr("x2", function(d) {
                return d.target.x;
            })
            .attr("y2", function(d) {
                return d.target.y;
            });

        node.attr("cx", function(d) {
                return d.x;
            })
            .attr("cy", function(d) {
                return d.y;
            })
            .attr("transform", function(d) {
                return "translate(" + d.x + "," + d.y + ")"
            });
    }

    // free memory
    nodes = null;
    links = null;
}

/* deep copy method,
http://stackoverflow.com/questions/728360/how-do-i-correctly-clone-a-javascript-object
*/
function clone(obj) {
    var copy;

    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
};
