HTMLWidgets.widget({

  name: 'timesweep',

  type: 'output',

  initialize: function(el, width, height) {
    

    // defaults
    var defaults = {
        paddingGeneral: 15,
        legendWidth: 100,
        legendHeight: 160,
        treeHeight: 100,
        treeWidth: 100,
        xAxisHeight: 30,
        yAxisWidth: 20,
        smallMargin: 5,
        transitionSpeed: 200,
        isPopOverVisible: false,
        button: false,
        gridsterBaseDimension: 120,
        switchView: true,
        panel_width: 30,
        centredView: false, // genotypes centred or not
        fontSize: 11,
        circleR: 20
    };

    // global variable vizObj
    vizObj = {};
    vizObj.data = {};
    vizObj.view = {};

    // set configurations
    var config = $.extend(true, {}, defaults);
    vizObj.view.config = config;
    var dim = vizObj.view.config;

    dim.canvasSVGWidth = width - dim.paddingGeneral - dim.paddingGeneral;
    dim.canvasSVGHeight = height - dim.paddingGeneral - dim.paddingGeneral;
    dim.tsSVGHeight = dim.canvasSVGHeight - dim.xAxisHeight - dim.smallMargin;
    dim.tsSVGWidth = dim.canvasSVGWidth - dim.legendWidth - dim.yAxisWidth - dim.smallMargin - dim.paddingGeneral;
    dim.xAxisWidth = dim.tsSVGWidth;
    dim.yAxisHeight = dim.tsSVGHeight;

    var canvasSVG = d3.select(el)
        .append("svg:svg")  
        .attr("class", "canvasSVG")     
        .attr("x", 0)
        .attr("y", 0) 
        .attr("width", dim.canvasSVGWidth) 
        .attr("height", dim.canvasSVGHeight)
        .style("float", "left")
        .style("margin-right",  dim.paddingGeneral)
        .style("margin-left",  dim.paddingGeneral)
        .style("margin-top",  dim.paddingGeneral)
        .style("margin-bottom",  dim.paddingGeneral);

    var tsSVG = d3.select(".canvasSVG")
        .append("g")  
        .attr("class", "tsSVG")     
        .attr("transform", "translate(" + (dim.yAxisWidth + dim.smallMargin) + "," + 0 + ")");

    var yAxisSVG = d3.select(".canvasSVG") 
        .append("g") 
        .attr("class", "yAxisSVG")      
        .attr("transform", "translate(" + 0 + "," + 0 + ")");

    var xAxisSVG = d3.select(".canvasSVG") 
        .append("g") 
        .attr("class", "xAxisSVG")      
        .attr("transform", "translate(" + 0 + "," + (dim.tsSVGHeight + dim.smallMargin) + ")");

    var tsLegendSVG = d3.select(".canvasSVG")
        .append("g") 
        .attr("class", "tsLegendSVG")
        .attr("transform", "translate(" + (dim.yAxisWidth + dim.smallMargin + dim.tsSVGWidth + dim.paddingGeneral) + "," + 0 + ")");


    var tsTree = d3.select(".canvasSVG")
        .append("g") 
        .attr("class", "tsTreeSVG")
        .attr("transform", "translate(" + (dim.yAxisWidth + dim.smallMargin + dim.tsSVGWidth + dim.paddingGeneral) + "," + 
            (dim.tsSVGHeight - dim.treeHeight) + ")");

    vizObj.view.canvasSVG = canvasSVG;
    vizObj.view.xAxisSVG = xAxisSVG;
    vizObj.view.yAxisSVG = yAxisSVG;
    vizObj.view.tsSVG = tsSVG;
    vizObj.view.tsLegendSVG = tsLegendSVG;
    vizObj.view.tsTree = tsTree;

    vizObj.view.tsSVGWidth = dim.tsSVGWidth;
    vizObj.view.tsSVGHeight = dim.tsSVGHeight;

    return {}
    
  },

  renderValue: function(el, x, instance) {
    var dim = vizObj.view.config;


    // GET CONTENT


    // get tree nodes
    var nodeRX = /id (\d+)\s+label \"(\w+)\"/g;
    var nodesObj = {};
    while (node_matches = nodeRX.exec(x.tree_gml)) {
        nodesObj[node_matches[1]] = node_matches[2];
    }

    // get tree edges
    var edgeRX = /source (\d+)\s+target (\d+)/g;
    var edge_matches;
    var edges = [];
    while (edge_matches = edgeRX.exec(x.tree_gml)) {
        edges.push({
            "source": nodesObj[edge_matches[1]],
            "target": nodesObj[edge_matches[2]]
        });
    }

    // get tree structure
    var nodesByName = [];
    for (var i = 0; i < edges.length; i++) {
        var parent = _findNodeByName(nodesByName, edges[i].source);
        var child = _findNodeByName(nodesByName, edges[i].target);
        parent["children"].push(child);
    }
    var rootName = 'Root';
    var tree = _findNodeByName(nodesByName, rootName);
    
    // get descendants for each node
    var descendants = {};
    Object.keys(nodesObj).forEach(function(node, idx) {
        var curRoot = _findNodeByName(nodesByName, nodesObj[node]);
        var curDescendants = _getDescendantIds(curRoot, []);
        descendants[nodesObj[node]] = curDescendants;
    })

    // get ancestors for each node
    var ancestors = _getAncestorIds(descendants, nodesObj);

    // set the tree in vizObj
    vizObj.data.treeStructure = tree;
    vizObj.data.treeEdges = edges;
    vizObj.data.treeNodes = Object.keys(nodesObj).map(function(node) {
        return nodesObj[node];
    });
    vizObj.data.treeDescendantsArr = descendants;
    vizObj.data.treeAncestorsArr = ancestors;

    // retrieve the patient id
    vizObj.data.patient_id = x.patient;

    // for each time point, for each genotype, get cellular prevalence
    var cp_data = {};
    $.each(x.clonal_prev_JSON, function(idx, hit) { // for each hit (genotype/timepoint combination)
        // only parse data for a particular patient
        if (hit["patient_name"] == x.patient) {
            cp_data[hit["timepoint"]] = cp_data[hit["timepoint"]] || {};
            cp_data[hit["timepoint"]][hit["cluster"]] = parseFloat(hit["clonal_prev"]); 
        }
    });

    // get timepoints, prepend a "N" timepoint to represent the timepoint before any data originated
    var timepoints = Object.keys(cp_data).sort();
    timepoints.unshift("N");
    vizObj.data.timepoints = timepoints;

    // genotypes
    vizObj.data.genotypes = Object.keys(nodesObj).map(function(node, idx) {
        return nodesObj[node];
    });

    // depth first search of tree to get proper order of genotypes at each time point
    timesweep_data = {};

    // create timepoint zero with 100% cellular prevalence for the root of the tree
    cp_data["N"] = {};
    cp_data["N"]["Root"] = 1;
    vizObj.data.cp_data = cp_data;

    // get emergence values for each genotype
    var emergence_values = _getEmergenceValues(vizObj);
    vizObj.data.emergence_values = emergence_values;

    // reorder the tree according to the genotypes' emergent cellular prevalence values
    _reorderTree(vizObj, vizObj.data.treeStructure); // TODO is this working?????
    
    // traverse the tree to sort the genotypes into a final vertical stacking order (incorporating hierarchy)
    var gTypeStackOrder = [];
    _vStackOrder(vizObj.data.treeStructure, emergence_values, gTypeStackOrder)
    vizObj.data.gTypeStackOrder = gTypeStackOrder;


    // --> TRADITIONAL TIMESWEEP VIEW (HIERARCHICAL GENOTYPES) <-- //

    // ------> STACKED

    // get cellular prevalences for each genotype in a stack, one stack for each time point
    var gTypeStacks = _getGenotypeStacks(vizObj);
    vizObj.data.gTypeStacks = gTypeStacks; 

    // ------> CENTRED

    // get layout of each genotype at each timepoint
    var layout = {};
    $.each(vizObj.data.timepoints, function(tp_idx, tp) { // for each time point
        _getLayout(vizObj, vizObj.data.treeStructure, tp, layout, 0);
    })
    vizObj.data.layout = layout;    


    // get cellular prevalence labels for each genotype at each time point 
    var ts_labels = _getTraditionalCPLabels(vizObj);
    vizObj.data.ts_labels = ts_labels;

    // shift x-values if >1 genotype emerges at the same time point from the same clade in the tree
    _shiftEmergence(vizObj)

    // convert genotype stacks at each time point into a list of moves for each genotype's d3 path object
    var traditional_paths = _getTraditionalPaths(vizObj);
    vizObj.data.traditional_paths = traditional_paths;


    // --> SEPARATE TIMESWEEP VIEW (SEPARATE GENOTYPES) <-- //

    // convert time-centric cellular prevalence data into genotype-centric cellular prevalence data
    _getGenotypeCPData(vizObj);

    // get paths for each genotype
    var separate_paths = _getSeparatePaths(vizObj);
    vizObj.data.separate_paths = separate_paths;

    // get cellular prevalence labels for each genotype at each time point
    var ts_sep_labels = _getSeparateCPLabels(vizObj);
    vizObj.data.ts_sep_labels = ts_sep_labels;



    // SET CONTENT


    // get bezier paths
    var bezier_paths = _getBezierPaths(vizObj.data.traditional_paths, dim.tsSVGWidth, dim.tsSVGHeight);
    vizObj.data.bezier_paths = bezier_paths;

    // get separate bezier paths
    var separate_bezier_paths = _getBezierPaths(vizObj.data.separate_paths, dim.tsSVGWidth, dim.tsSVGHeight);
    vizObj.data.separate_bezier_paths = separate_bezier_paths;

    // get colour assignment based on tree hierarchy
    var colour_assignment = {};
    // if unspecified, use default
    if (x.node_col_JSON == "NA") {
        var colour_palette = _getColourPalette();
        var chains = _getLinearTreeSegments(vizObj.data.treeStructure, {}, "");
        colour_assignment = _colourTree(vizObj, chains, vizObj.data.treeStructure, colour_palette, {}, "Greens");
    }
    // otherwise, use specified colours
    else {
        x.node_col_JSON.forEach(function(col, col_idx) {
            var col_value = col.col;
            if (col_value[0] != "#") { // append a hashtag if necessary
                col_value = "#".concat(col_value);
            }
            if (col_value.length > 7) { // remove any alpha that may be present in the hex value
                col_value = col_value.substring(0,7);
            }
            colour_assignment[col.node_label] = col_value;
        });
        colour_assignment['Root'] = "#000000";
    }


    // plot timesweep data
    var patientID_class = 'patientID_' + vizObj.data.patient_id
    vizObj.view.tsSVG
        .selectAll('.tsPlot')
        .data(vizObj.data.bezier_paths, function(d) {
            return d.gtype;
        })
        .enter().append('path')
        .attr('class', function() { return 'tsPlot ' + patientID_class; })
        .attr('d', function(d) { return d.path; })
        .attr('fill', function(d) { 
            if (x.alpha == "NA") {
                return colour_assignment[d.gtype]; 
            }
            else {
                return _increase_brightness(colour_assignment[d.gtype], x.alpha);
            }
        }) 
        .attr('stroke', function(d) { return colour_assignment[d.gtype]; })
        .on('click', function() {
            // hide any cellular prevalence labels
            d3.selectAll(".label, .sepLabel")
                .attr('opacity', 0);
            d3.selectAll(".labelCirc, .sepLabelCirc")
                .attr('fill-opacity', 0);

            // transition to separate timesweep view
            if (dim.switchView) {
                var sweeps = vizObj.view.tsSVG
                    .selectAll('.tsPlot')
                    .data(vizObj.data.separate_bezier_paths, function(d) {
                        return d.gtype;
                    })

                sweeps
                    .transition()
                    .duration(1000)
                    .attrTween("d", _pathTween(vizObj, "move"));

                // remove genotypes that do not have cellular prevalence values
                sweeps
                    .exit()
                    .transition()
                    .duration(1000)
                    .attrTween("d", _pathTween(vizObj, "exit"))
                    .remove();
            }
            // transition to traditional timesweep view
            else {
                var sweeps = vizObj.view.tsSVG
                    .selectAll('.tsPlot')
                    .data(vizObj.data.bezier_paths, function(d) {
                        return d.gtype;
                    })

                sweeps
                    .transition()
                    .duration(1000)
                    .attrTween("d", _pathTween(vizObj, "move"));

                // add those genotypes that do not have cellular prevalence values, but are in the hierarchy
                sweeps
                    .enter()
                    .insert('path', '.tsPlot')
                    .attr('class', 'tsPlot')
                    .attr("d", _centreLine(vizObj))
                    .attr('fill', function(d) { return colour_assignment[d.gtype]; }) 
                    .transition()
                    .duration(1000)
                    .attrTween("d", _pathTween(vizObj, "move"));
            }
            dim.switchView = !dim.switchView;
            
        })
        .on('mouseover', function(d) {
            var curGtype = d.gtype,
                brightness;

            // dim other genotypes
            d3.selectAll('.tsPlot.' + patientID_class)
                .attr('fill', function(d) { 
                    if (d.gtype != curGtype) {
                        brightness = Math.round(_get_brightness(colour_assignment[d.gtype])) + 70;
                        if (brightness > 255) {
                            brightness = 255;
                        }
                        return _rgb2hex("rgb(" + brightness + "," + brightness + "," + brightness + ")");
                    }
                    return colour_assignment[d.gtype];
                })
                .attr('stroke', function(d) {
                        if (d.gtype == curGtype) {
                            return 'grey';
                        }
                        return null;
                    });

            // traditional view
            if (dim.switchView) { 
                // show labels
                d3.selectAll(".label.gtype_" + curGtype + '.' + patientID_class)
                    .attr('opacity', 1);

                // show label backgrounds
                d3.selectAll(".labelCirc.gtype_" + curGtype)
                    .attr('fill-opacity', 0.5);                
            }

            // separate genotypes view
            else { 
                // show labels
                d3.selectAll(".sepLabel.gtype_" + curGtype + '.' + patientID_class)
                    .attr('opacity', 1);

                // show label backgrounds
                d3.selectAll(".sepLabelCirc.gtype_" + curGtype)
                    .attr('fill-opacity', 0.5);                
            }

        })
        .on('mouseout', function(d) {
            var curGtype = d.gtype;

            // reset colours
            d3.selectAll('.tsPlot.' + patientID_class)
                .attr('fill', function(d) { 
                    if (x.alpha == "NA") {
                        return colour_assignment[d.gtype]; 
                    }
                    else {
                        return _increase_brightness(colour_assignment[d.gtype], x.alpha);
                    }
                })
                .attr('stroke', null);;

            // traditional view
            if (dim.switchView) {
                // hide labels
                d3.selectAll(".label.gtype_" + curGtype + '.' + patientID_class)
                    .attr('opacity', 0);

                // hide label backgrounds
                d3.selectAll(".labelCirc.gtype_" + curGtype)
                    .attr('fill-opacity', 0);
            }

            // separate genotypes view
            else {
                // hide labels
                d3.selectAll(".sepLabel.gtype_" + curGtype + '.' + patientID_class)
                    .attr('opacity', 0);

                // hide label backgrounds
                d3.selectAll(".sepLabelCirc.gtype_" + curGtype)
                    .attr('fill-opacity', 0);
            }

        });

    // plot time point guides
    vizObj.view.tsSVG
        .selectAll('.tpGuide')
        .data(vizObj.data.timepoints)
        .enter().append('line')
        .attr('class', function(d) { return 'tpGuide tp_' + d + ' ' + patientID_class; })
        .attr('x1', function(d, i) { return (i / (vizObj.data.timepoints.length - 1)) * dim.tsSVGWidth; })
        .attr('x2', function(d, i) { return (i / (vizObj.data.timepoints.length - 1)) * dim.tsSVGWidth; })
        .attr('y1', 0)
        .attr('y2', dim.tsSVGHeight)
        .attr('stroke', 'black')
        .attr('stroke-opacity', '0')
        .attr('stroke-width', '1.5px')
        .style('pointer-events', 'none');

    // plot cellular prevalence labels at each time point - traditional timesweep view 
    var labels = vizObj.data.ts_labels.concat(vizObj.data.ts_sep_labels);

    var labelG = vizObj.view.tsSVG
        .selectAll('.gLabel')
        .data(labels)
        .enter().append('g')
        .attr('class', 'gLabel');

    labelG
        .append('circle')
        .attr('class', function(d) { 
            if (d.type == "traditional") {
                return 'labelCirc tp_' + d.tp + ' gtype_' + d.gtype + ' ' + patientID_class; 
            }
            return 'sepLabelCirc tp_' + d.tp + ' gtype_' + d.gtype + ' ' + patientID_class; 
        }) 
        .attr('cx', function(d) { 

            // index of this time point relative to others
            var index = vizObj.data.timepoints.indexOf(d.tp); 

            var x_val = (index / (vizObj.data.timepoints.length-1)) * (dim.tsSVGWidth);

            // if the time point is the last
            if (index == vizObj.data.timepoints.length - 1) {
                // shift it to the left
                x_val -= dim.circleR;
            }

            return x_val; 
        })
        .attr('cy', function(d) { 
            // if the label, when centered vertically...
            // ... is cut off at the top, shift down
            if (((dim.tsSVGHeight-(d.middle*dim.tsSVGHeight)) + ((d.cp/2)*dim.tsSVGHeight)) < dim.circleR) {
                return 1 + dim.circleR;
            }

            // ... is cut off at the bottom, shift up
            else if (((d.middle*dim.tsSVGHeight) + ((d.cp/2)*dim.tsSVGHeight)) < dim.circleR) {
                return dim.tsSVGHeight - 1 - dim.circleR;
            }

            // ... is not cut off, center vertically
            return (1 - d.middle)*dim.tsSVGHeight; 
        })
        .attr('r', dim.circleR)
        .attr('fill', 'white')
        .attr('fill-opacity', 0)
        .style('pointer-events', 'none');

    labelG
        .append('text')
        .attr('font-family', 'sans-serif')
        .attr('font-size', dim.fontSize)
        .attr('class', function(d) { 
            if (d.type == "traditional") {
                return 'label tp_' + d.tp + ' gtype_' + d.gtype + ' ' + patientID_class; 
            }
            return 'sepLabel tp_' + d.tp + ' gtype_' + d.gtype + ' ' + patientID_class; 
        }) 
        .text(function(d) {
            return (Math.round(d.cp * 100) / 1).toString();
        })
        .attr('x', function(d) { 

            // index of this time point relative to others
            var index = vizObj.data.timepoints.indexOf(d.tp); 

            var x_val = (index / (vizObj.data.timepoints.length-1)) * (dim.tsSVGWidth);

            // if the time point is the last
            if (index == vizObj.data.timepoints.length - 1) {
                // shift it to the left
                x_val -= dim.circleR;
            }

            return x_val; 
        })
        .attr('y', function(d) { return (1 - d.middle)*dim.tsSVGHeight; })
        .attr('dy', function(d) {

            // if the label, when centered vertically...
            // ... is cut off at the top, shift down
            if (((dim.tsSVGHeight-(d.middle*dim.tsSVGHeight)) + ((d.cp/2)*dim.tsSVGHeight)) < dim.circleR) {
                d3.select(this).attr('y', 1 + dim.circleR);
            }

            // ... is cut off at the bottom, shift up
            else if (((d.middle*dim.tsSVGHeight) + ((d.cp/2)*dim.tsSVGHeight)) < dim.circleR) {
                d3.select(this).attr('y', dim.tsSVGHeight - 1 - dim.circleR);
            }

            // ... is not cut off, center vertically
            return '.35em';
        })
        .attr('fill', 'black')
        .attr('opacity', 0)
        .attr('text-anchor', 'middle')
        .style('pointer-events', 'none');


    // PLOT AXES

    // plot x-axis labels
    vizObj.view.xAxisSVG
        .selectAll('.xAxisLabels')
        .data(vizObj.data.timepoints)
        .enter().append('text')
        .attr('class', 'xAxisLabels')
        .attr('x', function(d, i) { 
            return (i / (vizObj.data.timepoints.length-1)) * (dim.tsSVGWidth) + dim.smallMargin + dim.yAxisWidth; 
        })
        .attr('y', 0)
        .attr('dy', '.71em')
        .attr('text-anchor', 'middle')
        .attr('font-family', 'sans-serif')
        .attr('font-size', '11px')
        .text(function(d) { return d; })
        .on('mouseover', function(d) {
            d3.selectAll(".tpGuide.tp_" + d + '.' + patientID_class).attr('stroke-opacity', 1); 
        })
        .on('mouseout', function(d) {
            d3.selectAll(".tpGuide.tp_" + d + '.' + patientID_class).attr('stroke-opacity', 0);
        });

    // plot y-axis title
    vizObj.view.yAxisSVG
        .append('text')
        .attr('class', 'axisTitle yAxis')
        .attr('x', 0)
        .attr('y', 0)
        .attr('dy', '.35em')
        .attr('text-anchor', 'middle')
        .attr('font-family', 'sans-serif')
        .attr('font-size', '15px')
        .attr('font-weight', 'bold')
        .attr('transform', "translate(" + (dim.yAxisWidth/2) + ", " + (dim.tsSVGHeight/2) + ") rotate(-90)")
        .text(function() { 
            return (x.yaxis_title == "NA") ? "Relative Cellular Prevalence" : x.yaxis_title;
        });

    // plot x-axis title
    vizObj.view.xAxisSVG
        .append('text')
        .attr('class', 'axisTitle xAxis')
        .attr('x', dim.yAxisWidth + dim.smallMargin + dim.xAxisWidth/2)
        .attr('y', 25)
        .attr('text-anchor', 'middle')
        .attr('font-family', 'sans-serif')
        .attr('font-size', '15px')
        .attr('font-weight', 'bold')
        .text(function() { 
            return (x.xaxis_title == "NA") ? "Time Point" : x.xaxis_title;
        });

    // PLOT LEGEND

    // plot legend rectangles
    vizObj.view.tsLegendSVG
        .selectAll('.legendRect')
        .data(vizObj.data.treeNodes)
        .enter().append('rect')
        .attr('class', 'legendRect')
        .attr('x', 0)
        .attr('y', function(d, i) { return i*13 + 25; }) // 25 for legend title
        .attr('height', 10)
        .attr('width', 10)
        .attr('fill', function(d) { return colour_assignment[d]; });

    // plot legend text
    vizObj.view.tsLegendSVG
        .selectAll('.legendText')
        .data(vizObj.data.treeNodes)
        .enter().append('text')
        .attr('class', 'legendText')
        .attr('x', 20)
        .attr('y', function(d, i) { return (i*13) + 5 + 25; }) // 25 for legend title, 5 for centring w/resp. to rectangle
        .attr('dy', '.35em')
        .attr('font-size', '11px')
        .attr('font-family', 'sans-serif')
        .style('text-anchor', 'left')
        .text(function(d) { return d; });

    // plot legend title
    vizObj.view.tsLegendSVG
        .append('text')
        .attr('class', 'legendTitle')
        .attr('x', 0)
        .attr('y', 0)
        .attr('dy', '.71em')
        .attr('text-anchor', 'left')
        .attr('font-family', 'sans-serif')
        .attr('font-size', '15px')
        .attr('font-weight', 'bold')
        .text('Genotype');


    // PLOT TREE GLYPH

    // plot tree title
    vizObj.view.tsTree
        .append('text')
        .attr('class', 'treeTitle')
        .attr('x', 0)
        .attr('y', 0)
        .attr('dy', '.71em')
        .attr('text-anchor', 'left')
        .attr('font-family', 'sans-serif')
        .attr('font-size', '15px')
        .attr('font-weight', 'bold')
        .text('Tree'); 

    // d3 tree layout
    var treePadding = 20;
    var treeTitleHeight = d3.select('.treeTitle').node().getBBox().height;
    var treeLayout = d3.layout.tree()           
        .size([dim.treeHeight - treePadding - treeTitleHeight, dim.treeWidth - treePadding]); 

    // get nodes and links
    var root = $.extend({}, vizObj.data.treeStructure); // copy tree into new variable
    var nodes = treeLayout.nodes(root); 
    var links = treeLayout.links(nodes);   
 
    // swap x and y direction
    nodes.forEach(function(node) {
        node.tmp = node.y;
        node.y = node.x + (treePadding/2) + treeTitleHeight;
        node.x = node.tmp + (treePadding/2);
        delete node.tmp;
    });

    // create links
    var link = vizObj.view.tsTree.append("g")
        .classed("treeLinks", true)
        .selectAll(".treeLink")                  
        .data(links)                   
        .enter().append("path")                   
        .attr("class","treeLink")
        .attr('stroke', 'black')
        .attr('fill', 'none')                
        .attr("d", _elbow); 

    // create nodes
    var node = vizObj.view.tsTree.selectAll(".treeNode")                  
        .data(nodes)                   
        .enter()
        .append("circle")     
        .attr("cx", function(d) { return d.x})
        .attr("cy", function(d) { return d.y})              
        .classed("treeNode", true) 
        .attr("fill", function(d) {
            return colour_assignment[d.id];
        })
        .attr("id", function(d) { return d.sc_id; })
        .attr("r", 4)
        .append("title")
        .text(function(d) { return d.id; });
  },

  resize: function(el, width, height, instance) {

    var dim = vizObj.view.config;

    dim.canvasSVGWidth = width - dim.paddingGeneral - dim.paddingGeneral;
    dim.canvasSVGHeight = height - dim.paddingGeneral - dim.paddingGeneral;
    dim.tsSVGHeight = dim.canvasSVGHeight - dim.xAxisHeight - dim.smallMargin;
    dim.tsSVGWidth = dim.canvasSVGWidth - dim.legendWidth - dim.yAxisWidth - dim.smallMargin - dim.paddingGeneral;
    dim.xAxisWidth = dim.tsSVGWidth;
    dim.yAxisHeight = dim.tsSVGHeight;

    var canvasSVG = d3.select(".canvasSVG")
        .attr("width", dim.canvasSVGWidth) 
        .attr("height", dim.canvasSVGHeight);

    var xAxisSVG = d3.select(".xAxisSVG")    
        .attr("transform", "translate(" + 0 + "," + (dim.tsSVGHeight + dim.smallMargin) + ")");

    var tsLegendSVG = d3.select(".tsLegendSVG")
        .attr("transform", "translate(" + (dim.yAxisWidth + dim.smallMargin + dim.tsSVGWidth + dim.paddingGeneral) + "," + 0 + ")");


    var tsTree = d3.select(".tsTreeSVG")
        .attr("transform", "translate(" + (dim.yAxisWidth + dim.smallMargin + dim.tsSVGWidth + dim.paddingGeneral) + "," + 
            (dim.tsSVGHeight - dim.treeHeight) + ")");

    
    // SET CONTENT


    // get bezier paths
    vizObj.data.bezier_paths = _getBezierPaths(vizObj.data.traditional_paths, dim.tsSVGWidth, dim.tsSVGHeight);

    // get separate bezier paths
    vizObj.data.separate_bezier_paths = _getBezierPaths(vizObj.data.separate_paths, dim.tsSVGWidth, dim.tsSVGHeight);

    // plot timesweep data
    var newTsPlot;

    if (dim.switchView) {
        newTsPlot = d3.selectAll('.tsPlot')
        .data(vizObj.data.bezier_paths, function(d) {
            return d.gtype;
        });
    } else {
        newTsPlot = d3.selectAll('.tsPlot')
        .data(vizObj.data.separate_bezier_paths, function(d) {
            return d.gtype;
        });
    }
    newTsPlot.enter().append('path');
    newTsPlot.exit().remove();
    newTsPlot
        .attr('d', function(d) { return d.path});

    // plot time point guides
    d3.selectAll('.tpGuide')
        .attr('x1', function(d, i) { return (i / (vizObj.data.timepoints.length - 1)) * dim.tsSVGWidth; })
        .attr('x2', function(d, i) { return (i / (vizObj.data.timepoints.length - 1)) * dim.tsSVGWidth; })
        .attr('y2', dim.tsSVGHeight);

    // adjust cellular prevalence label (and background) positioning
    d3.selectAll('.labelCirc, .sepLabelCirc')
        .attr('cx', function(d) { 

            // index of this time point relative to others
            var index = vizObj.data.timepoints.indexOf(d.tp); 

            var x_val = (index / (vizObj.data.timepoints.length-1)) * (dim.tsSVGWidth);

            // if the time point is the last
            if (index == vizObj.data.timepoints.length - 1) {
                // shift it to the left
                x_val -= dim.circleR;
            }

            return x_val; 
        })
        .attr('cy', function(d) { 
            // if the label, when centered vertically...
            // ... is cut off at the top, shift down
            if (((dim.tsSVGHeight-(d.middle*dim.tsSVGHeight)) + ((d.cp/2)*dim.tsSVGHeight)) < dim.circleR) {
                return 1 + dim.circleR;
            }

            // ... is cut off at the bottom, shift up
            else if (((d.middle*dim.tsSVGHeight) + ((d.cp/2)*dim.tsSVGHeight)) < dim.circleR) {
                return dim.tsSVGHeight - 1 - dim.circleR;
            }

            // ... is not cut off, center vertically
            return (1 - d.middle)*dim.tsSVGHeight; 
        });

    d3.selectAll('.label, .sepLabel')
        .attr('x', function(d) { 

            // index of this time point relative to others
            var index = vizObj.data.timepoints.indexOf(d.tp); 

            var x_val = (index / (vizObj.data.timepoints.length-1)) * (dim.tsSVGWidth);

            // if the time point is the last
            if (index == vizObj.data.timepoints.length - 1) {
                // shift it to the left
                x_val -= dim.circleR;
            }

            return x_val; 
        })
        .attr('y', function(d) { return (1 - d.middle)*dim.tsSVGHeight; })
        .attr('dy', function(d) {

            if (d.type == "traditional") {
                // if the label, when centered vertically...
                // ... is cut off at the top, shift down
                if (((dim.tsSVGHeight-(d.middle*dim.tsSVGHeight)) + ((d.cp/2)*dim.tsSVGHeight)) < dim.circleR) {
                    d3.select(this).attr('y', 1 + dim.circleR);
                }

                // ... is cut off at the bottom, shift up
                else if (((d.middle*dim.tsSVGHeight) + ((d.cp/2)*dim.tsSVGHeight)) < dim.circleR) {
                    d3.select(this).attr('y', dim.tsSVGHeight - 1 - dim.circleR);
                }

                // ... is not cut off, center vertically
                return '.35em';
            }
            else {
                // if the label, when centered vertically...
                // ... is cut off at the top, shift down
                if (((dim.tsSVGHeight-(d.top*dim.tsSVGHeight)) + ((d.cp/2)*dim.tsSVGHeight)) < dim.circleR) {
                    d3.select(this).attr('y', '1px');
                    return '.71em';
                }

                // ... is cut off at the bottom, shift up
                else if (((d.bottom*dim.tsSVGHeight) + ((d.cp/2)*dim.tsSVGHeight)) < dim.circleR) {
                    d3.select(this).attr('y', dim.tsSVGHeight);
                    return '-1px';
                }

                // ... is not cut off, center vertically
                return '.35em';
            }

        })
        .attr('fill', 'black')
        .attr('opacity', 0)
        .attr('text-anchor', 'middle')
        .style('pointer-events', 'none');


    // PLOT AXES

    // plot x-axis labels
    d3.selectAll('.xAxisLabels')
        .attr('x', function(d, i) { 
            return (i / (vizObj.data.timepoints.length-1)) * (dim.tsSVGWidth) + dim.smallMargin + dim.yAxisWidth; 
        });

    // plot y-axis title
    d3.select('.axisTitle.yAxis')
        .attr('x', 0)
        .attr('y', 0)
        .transition()
        .duration(300)
        .attr('transform', function() {
            return "translate(" + (dim.yAxisWidth/2) + ", " + (dim.tsSVGHeight/2) + ") rotate(-90)";
        });

    // plot x-axis title
    d3.select('.axisTitle.xAxis')
        .attr('x', dim.yAxisWidth + dim.smallMargin + dim.xAxisWidth/2);
   
    return {}
    
  }

});
