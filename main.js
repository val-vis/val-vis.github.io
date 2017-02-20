// html element that holds the chart
var viz_container;

/* data loading */
var dataMap = d3.map();
dataMap.set("2012", "data/relationship-2012.json");
dataMap.set("2016", "data/relationship-2016.json");

var currYear="2016";
var currContract="all";
var currNode = {};

var cachedData = {};

/* d3 initialization */
// reset DOM
d3.select("#graph").selectAll("*").remove();
var svg = d3.select("#graph").append("svg").attr("width", window.innerWidth).attr("height", window.innerHeight),
    width = +svg.attr("width"),
    height = +svg.attr("height");

var simulation = d3.forceSimulation()
    .force("charge", d3.forceManyBody().strength(-3000))
    .force("collide", d3.forceCollide(function(d) {
        return 8;
    }).iterations(10))
    .force("link", d3.forceLink().id(function(d) {
        return d.id;
    }).distance(200))
    .force("center", d3.forceCenter(width / 3, height / 3))
    .alpha(0.6);

var radius = d3.scaleSqrt()
    .range([0, 1.5]);

var donutRadius = d3.scaleSqrt() // radius for donuts
    .range([0, 70]);

var circleScale = d3.scaleSqrt().range([0, 20]); // for pie

var color = d3.scaleOrdinal()
    .range(["#8ed8f8", "#00bfff", "#005baa"]);

var pieColor = {
    bilateral: '#8ed8f8',
    multilateral: '#00bfff',
    system: '#005baa'
};

var arc = d3.arc();

var pie = d3.pie()
    .sort(null)
    .padAngle(0.02)
    .startAngle(1.1 * Math.PI)
    .endAngle(3.1 * Math.PI)
    // .attr("opacity", "1")
    .value(function(d) {
        return d.count;
    });

/* materialcss init */
$('select').material_select(); //Materialize.css setup
$(".button-collapse").sideNav({menuWidth:210});

renderChart("2016", "");

// testRelationshipView("2016", "Algonquin");

function testRelationshipView(year, school) {
    d3.json(dataMap.get(year), function(error, data) {
        if (error) throw error;
        cachedData = data;
        renderReset();
        renderRelationshipView(school, cachedData);
    });
}

/*
For filtering year
*/
function updateData(year) {
    // change data set
    if (year !== currYear) {
        currYear=year;

        if (currContract != "all") {
            renderChart(year,currContract);
        } else {
            renderChart(year,"");
        }
    }
}

/*
For filtering contract type
*/
function updateContract(contract) {
    currContract=contract;
    renderChart("",contract);
}

function resumeMainView() {
    $('.backBtn').css("visibility", "hidden");

    if (cachedData) {
        renderReset();
        renderMultipleDonutView(cachedData);
    }
}

/* Erase graph */
function renderReset() {
    d3.select("#graph").select("svg").selectAll("*").remove();
    d3.select(".container").select(".chart").selectAll("*").remove();
    d3.select(".container").select(".vizuly").selectAll("*").remove();
}

function renderChart(year, contract) {
    /* This section manages the data filtering */
    if (year) { // filter by year
        if (contract) {
            // render multiple pie
            d3.json(dataMap.get(year), function(error, data) {
                if (error) throw error;
                cachedData = data;
                renderReset();
                renderMultiplePieView(contract, cachedData);
            });
        } else {
            d3.json(dataMap.get(year), function(error, data) {
                if (error) throw error;
                cachedData = data;
                renderReset();
                renderMultipleDonutView(cachedData);
            });
        }
    } else { // filter by contract
        if (contract && cachedData) {
            renderReset();

            if (contract === "all") {
                renderMultipleDonutView(cachedData);
            } else {
                renderMultiplePieView(contract, cachedData);
            }
        }
    }
}

function showInfo(d) {
    if (d && d.id) { // tooltip for donut
        var label = d3.select("#institution-info")
            .append("h4")
            .attr("id", "school-title")
            .text(d.id)
            .append("p")
            .attr("id", "school-data")
            .text("Total sending agreements: " + d.size);
    } else if (d && d.school) {
        var label = d3.select("#institution-info")
            .append("h4")
            .attr("id", "school-title")
            .text(d.school)
            .append("p")
            .attr("id", "school-data")
            .text("Sending agreements: " + d.count);
    }
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
    var nodes = data.nodes;

    donutRadius.domain([0, d3.max(nodes, function(d) {
        return d.size;
    })]);

    color.domain(nodes);

    var chart = d3.select(".container").select(".chart");

    var svg = chart.selectAll(".pie")
        .data(nodes.sort(function(a, b) {
            return b.size - a.size;
        }))
        .enter().append("svg")
        .attr("class", "pie")
        .each(multiple)
        // .on("mouseover", showInfo)
        // .on("mouseout", removeInfo)
        .on("click", showRelationship)
        .select("g");

    //   var label = svg.append("text")
    //       .attr("class", "label");
    //
    //   label.append("tspan")
    //       .attr("class", "label-name")
    //       .attr("x", 0)
    //       .attr("dy", "-.2em")
    //       .text(function(d) {
    //           return d.id;
    //       });
    //
    //   label.append("tspan")
    //       .attr("class", "label-value")
    //       .attr("x", 0)
    //       .attr("dy", "1.1em")
    //       .text(function(d) {
    //           return d.size;
    //       });

    var legend = d3.select(".vizuly").append("svg")
        .attr("class", "legend")
        .attr("width", 120)
        .attr("height", (3) * 20)
        .selectAll("g")
        .data(nodes[0].paths)
        .enter().append("g")
        .attr("transform", function(d, i) {
            return "translate(0," + i * 20 + ")";
        });

    legend.append("rect")
        .attr("width", 28)
        .attr("height", 18)
        .style("fill", function(d) {
            return color(d.type);
        })
        .style("opacity", "0.5");

    legend.append("text")
        .attr("x", 34)
        .attr("y", 9)
        .attr("dy", ".35em")
        .text(function(d) {
            return d.type;
        });

    function multiple(d) {
        var outerRadius = donutRadius(d.size);
        var innerRadius = outerRadius * 0.7;
        var svg = d3.select(this)
            .attr("width", outerRadius * 2)
            .attr("height", outerRadius * 2)
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
    var pieData = [];

    data.nodes.forEach((d) => {
        pieData.push({
            school: d.id,
            count: getContractCount(d, modifier)
        });
    });

    var chart = d3.select(".container").select(".chart");

    var chart = chart.selectAll(".pie")
        .data(pieData.sort(function(a, b) {
            return b.count - a.count;
        }))
        .enter().append("svg")
        .attr("class", "pie")
        .each(multiple)
        // .on("mouseover", showInfo)
        // .on("mouseout", removeInfo)
        .select("g");

    //   var label = d3.selectAll(".pie").append("text")
    //       .attr("class", "label");
    //
    //   label.append("tspan")
    //       .attr("class", "label-name")
    //       .attr("x", 0)
    //       .attr("dy", "-.2em")
    //       .text(function(d) {
    //           return d.school;
    //       });
    //
    //   label.append("tspan")
    //       .attr("class", "label-value")
    //       .attr("x", 0)
    //       .attr("dy", "1.1em")
    //       .text(function(d) {
    //           return d.count;
    //       });

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
            .style("fill", pieColor[modifier]);
    }
}

function showRelationship(d) {
    //   console.log(d.id);

    currNode = d; // preserve node info for applying filters

    if (cachedData) {
        $('.backBtn').css("visibility", "visible")

        renderReset();

        renderRelationshipView(d.id, cachedData);
    }
}

/* TODO: does not render correctly when going back and forth between
main view and relationship view*/
function renderRelationshipView(school, graph) {
    // See https://github.com/d3/d3-force/blob/master/README.md#simulation_tick
    // for (var i = 0, n = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())); i < n; ++i) {
    //     simulation.tick();
    // }

    if (!school) return;

    // get nodes and links from raw data
    var links = graph.links.filter(function(l) {
        return l.source === school;
    });

    var nodes = [];

    links.forEach(function(l) {
        var target = graph.nodes.find(function(n) {
            return l.target === n.id;
        });

        if (target) {
            nodes.push(target);
        }
    });

    var source = graph.nodes.find(function(n) {
        return n.id === school;
    });

    nodes.push(source);

    var legend = d3.select(".vizuly").append("svg")
        .attr("class", "legend")
        .attr("width", 120)
        .attr("height", (3) * 20)
        .selectAll("g")
        .data(graph.nodes[0].paths)
        .enter().append("g")
        .attr("transform", function(d, i) {
            return "translate(0," + i * 20 + ")";
        });

    legend.append("rect")
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", function(d) {
            return color(d.type);
        })
        .style("opacity", "0.5");

    legend.append("text")
        .attr("x", 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .text(function(d) {
            return d.type;
        });

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
        .on("mouseover", showInfo)
        .on("mouseout", removeInfo)
        ;

    node.append("circle")
        .attr("r", function(d) {
            return radius(d.size * 0.55);
        })
        .attr("fill", "#fff");

    function multiple(d) {
        var outerRadius = radius(d.size);
        var innerRadius = outerRadius * 0.7;

        var subsvg = d3.select(this)
            // .attr("r", function(d){return radius(d.size)})
            .attr("width", outerRadius * 2)
            .attr("height", outerRadius * 2)
            .append("g");

        var g = subsvg.selectAll(".arc")
            .data(function(d) {
                return pie(d.paths);
            })
            .enter().append("g")
            .attr("class", "arc")
            .attr("id", function(d, i) {
                return "path" + d.data.type + i;
            });

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
}
