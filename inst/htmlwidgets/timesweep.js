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
        centredView: true,
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
    var colour_assignment;
    // if unspecified, use default
    if (x.node_col_JSON == "NA") {
        var colour_palette = _getColourPalette();
        var chains = _getLinearTreeSegments(vizObj.data.treeStructure, {}, "");
        colour_assignment = _colourTree(vizObj, chains, vizObj.data.treeStructure, colour_palette, {}, "Greys");
    }
    // otherwise, use specified colours
    else {
        colour_assignment = {};
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
        .attr('fill', function(d) { return colour_assignment[d.gtype]; }) 
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
                    .attrTween("d", _pathTween("move"));

                // remove genotypes that do not have cellular prevalence values
                sweeps
                    .exit()
                    .transition()
                    .duration(1000)
                    .attrTween("d", _pathTween("exit"))
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
                    .attrTween("d", _pathTween("move"));

                // add those genotypes that do not have cellular prevalence values, but are in the hierarchy
                sweeps
                    .enter()
                    .insert('path', '.tsPlot')
                    .attr('class', 'tsPlot')
                    .attr("d", _centreLine())
                    .attr('fill', function(d) { return colour_assignment[d.gtype]; }) 
                    .transition()
                    .duration(1000)
                    .attrTween("d", _pathTween("move"));
            }
            dim.switchView = !dim.switchView;
            
        })
        .on('mouseover', function(d) {
            var curGtype = d.gtype;

            // dim other genotypes
            d3.selectAll('.tsPlot.' + patientID_class)
                .attr('fill', function(d) { 
                    if (d.gtype != curGtype) {
                        return 'grey';
                    }
                    return colour_assignment[d.gtype];
                })
                .attr('stroke', function(d) { 
                    if (d.gtype != curGtype) {
                        return 'white';
                    }
                    return colour_assignment[d.gtype];
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
                .attr('fill', function(d) { return colour_assignment[d.gtype]; }) 
                .attr('stroke', function(d) { return colour_assignment[d.gtype]; });

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

   



    // FUNCTIONS

    /*
    * function to get the layout of the timesweep
    * @param {Object} vizObj
    * @param {Object} curNode -- current node in the tree
    * @param {Number} yBottom -- where is the bottom of this genotype, in the y-dimension
    */
    function _getLayout(vizObj, curNode, tp, layout, yBottom) {
        var cp_data = vizObj.data.cp_data;
        var timepoints = vizObj.data.timepoints;
        var next_tp = timepoints[timepoints.indexOf(tp)+1];
        var prev_tp = timepoints[timepoints.indexOf(tp)-1];
        var gtype = curNode.id;
        var curDescendants = vizObj.data.treeDescendantsArr[gtype];
        var gTypeAndDescendants = ($.extend([], curDescendants)); 
        gTypeAndDescendants.push(gtype); // genotype and descendants
        var gTypes_curTP = Object.keys(cp_data[tp]); // genotypes with cp data at the CURRENT time point
        var gTypes_prevTP = (cp_data[prev_tp]) ? Object.keys(cp_data[prev_tp]) : undefined; // genotypes with cp data at the PREVIOUS time point
        var cur_cp = cp_data[tp][gtype];

        layout[tp] = layout[tp] || {};

        // if the genotype or any descendants exist at this timepoint
        if ((cur_cp || (_getIntersection(curDescendants, gTypes_curTP).length > 0)) 
            && curNode.id != "Root") {

            // get the width of this genotype at this time point, including all descendants
            var width = _calculateWidth(vizObj, tp, gtype);

            // if this genotype or any descendants emerge at the previous time point
            if (gTypes_prevTP && _getIntersection(gTypeAndDescendants, gTypes_prevTP).length == 0) {

                layout[prev_tp][gtype] = {
                    "width": 0,
                    "middle": yBottom + (width/2),
                    "bottom": yBottom + (width/2),
                    "top": yBottom + (width/2),
                    "cp": 0,
                    "state": "emerges"
                };
            }

            // set this genotype in the layout 
            layout[tp][gtype] = {
                "width": width,
                "middle": yBottom + (width/2),
                "bottom": yBottom,
                "top": yBottom + width,
                "cp": cur_cp,
                "state": "present"
            }
        }

        // for each child, get its layout
        var nChildren = curNode.children.length;
        var childCP = 0; // cumulative amount of cellular prevalence in the children
        if (nChildren > 0) {
            for (var i = 0; i < nChildren; i++) {
                var childYBottom = (cur_cp) ? (((i+1)/(nChildren+1)) * cur_cp) + childCP + yBottom : yBottom;
                _getLayout(vizObj, curNode.children[i], tp, layout, childYBottom);
                childCP += _calculateWidth(vizObj, tp, curNode.children[i].id);
            }
        }
    };

    /* function to get the width of this genotype at this time point, including all descendants
    * @param {Object} vizObj
    * @param {String} tp -- current time point
    * @param {String} gtype -- current genotype
    */
    function _calculateWidth(vizObj, tp, gtype) {
        var cp_data = vizObj.data.cp_data;
        var cur_cp = cp_data[tp][gtype];
        var curDescendants = vizObj.data.treeDescendantsArr[gtype];

        // width starts out as the cellular prevalence for this genotype at this time point
        var width = cur_cp || 0;

        // for each descendant, add its cellular prevalence at this time to the genotype's width
        $.each(curDescendants, function(desc_idx, desc) {
            if (cp_data[tp][desc]) {
                width += cp_data[tp][desc];
            }
        })

        return width;
    }

    /* function to find a node by its name - if the node doesn't exist, it will be created and added to the list of nodes
    * @param {Array} list - list of nodes
    * @param {String} name - name of node to find
    */
    function _findNodeByName(list, name) {
        var foundNode = _.findWhere(list, {id: name});
        if (!foundNode) {
            var curNode = {'id': name, 'children': []};
            list.push(curNode);
            return curNode;
        }
        return foundNode;
    }

    /* function to get descendants id's for the specified node
    * @param {Object} root - node for which we want descendants
    * @param {Array} descendants - initially empty array for descendants to be placed into
    */
    function _getDescendantIds(root, descendants) {
        if (root["children"].length > 0) {
            for (var i = 0; i < root["children"].length; i++) {
                var child = root["children"][i];
                descendants.push(child["id"]);
                _getDescendantIds(child, descendants);
            }
        }
        return descendants;
    }

    /* function to get the ancestor ids for all nodes
    * @param descendants_arr {Array} -- array of nodes and their descendants 
    *      e.g. [{"id": "1", "descendants": ["2","3"]}, {"id": "2","descendants": []}]
    */
    function _getAncestorIds(descendants_arr, nodes) {
        var ancestors = {};
        // set up each node as originally containing an empty list of ancestors
        Object.keys(nodes).forEach(function(node, idx) {
            ancestors[nodes[node]] = [];
        })

        // get ancestors data from the descendants data
        Object.keys(nodes).forEach(function(node, idx) {
            // for each descendant of this node
            var curDescendants = descendants_arr[nodes[node]];
            for (var i = 0; i < curDescendants.length; i++) { 
                // add the node to descentant's ancestor list
                ancestors[curDescendants[i]].push(nodes[node]);
            }
        })

        return ancestors;
    }

    /* function to get the cellular prevalence value for each genotype at its emergence
    * @param {Object} vizObj
    */
    function _getEmergenceValues(vizObj) {
        var cp_data = vizObj.data.cp_data;
        var emergence_values = {};

        // for each time point
        vizObj.data.timepoints.forEach(function(tp) { 

            // get genotypes
            var gtypes = Object.keys(cp_data[tp]); 

            // add genotypes if not present already
            $.each(gtypes, function(idx, g) {
                if (Object.keys(emergence_values).indexOf(g) == -1) { 
                    emergence_values[g] = cp_data[tp][g];
                }
            })
        });

        return emergence_values;
    };


    /* function to get the genotype-centric cellular prevalence data from the time-centric cellular prevalence data
    * @param {Object} vizObj
    */
    function _getGenotypeCPData(vizObj) {
        var cp_data = vizObj.data.cp_data;
        var genotype_cp = {};
        Object.keys(cp_data).forEach(function(tp, tp_idx) {
            Object.keys(cp_data[tp]).forEach(function(gtype, gtype_idx) {
                genotype_cp[gtype] = genotype_cp[gtype] || {};
                genotype_cp[gtype][tp] = cp_data[tp][gtype];
            });
        }); 
        vizObj.data.genotype_cp = genotype_cp;
    }

    /* elbow function to draw phylogeny links 
    */
    function _elbow(d) {
        return "M" + d.source.x + "," + d.source.y
            + "H" + (d.source.x + (d.target.x-d.source.x)/2)
            + "V" + d.target.y + "H" + d.target.x;
    }

    /*
    * function to, using the tree hierarchy, get the linear segments' starting node and length (including starting node)
    * @param {Object} curNode -- current node in the tree
    * @param {Object} chains -- originally empty object of the segments (key is segment start node, value is array of descendants in this chain)
    * @param {Object} base -- the base node of this chain
    */
    function _getLinearTreeSegments(curNode, chains, base) {

        // if it's a new base, create the base, with no descendants in its array yet
        if (base == "") {
            base = curNode.id;
            chains[base] = [];
        }
        // if it's a linear descendant, append the current node to the chain
        else {
            chains[base].push(curNode.id);
        }

        // if the current node has 1 child to search through
        if (curNode.children.length == 1) { 
            _getLinearTreeSegments(curNode.children[0], chains, base);
        }

        // otherwise for each child, create a blank base (will become that child)
        else {
            for (var i = 0; i < curNode.children.length; i++) {
                _getLinearTreeSegments(curNode.children[i], chains, "");
            }
        }

        return chains;
    }

    /*
    * function to, using the tree hierarchy, get appropriate colours for each genotype
    * @param {Object} vizObj
    * @param {Object} chains -- the linear segments (chains) in the genotype tree (key is segment start node, value is array of descendants in this chain)
    * @param {Object} curNode -- current node in the tree
    * @param {Array} palette -- colour themes to choose from
    * @param {Object} colour_assignment -- originally empty array of the final colour assignments
    * @param {String} curTheme -- the colour theme currently in use
    */
    function _colourTree(vizObj, chains, curNode, palette, colour_assignment, curTheme) {

        // if we're at the root, modify the colour palette here
        if (curNode.id == "Root") {
            var n = chains[curNode.id].length+1; // + 1 to include the base node (this child)
            var tmp_palette = [];
            for (var j = 8; j >= 0; j -= Math.floor(9/n)) {
                tmp_palette.push(palette[curTheme][j])
            }
            palette[curTheme] = tmp_palette;
        }

        // assign colour to this node
        colour_assignment[curNode.id] = palette[curTheme].shift();

        // if the current node has zero or >1 child to search through
        if (curNode.children.length != 1) { 

            // remove its colour theme from the colour themes available
            delete palette[curTheme];
        }

        // if the current node has one child only
        if (curNode.children.length == 1) {

            // colour child with the same theme as its parent
            _colourTree(vizObj, chains, curNode.children[0], palette, colour_assignment, curTheme)
        }

        // otherwise
        else {
            // reorder the children according to their emergent cellular prevalence
            var tmpChildren = $.extend([], curNode.children);
            // tmpChildren.sort(function(a, b) {return vizObj.data.gTypeStackOrder.indexOf(a.id) - vizObj.data.gTypeStackOrder.indexOf(b.id)});
            
            // for each child
            for (var i = 0; i < tmpChildren.length; i++) {

                // give it a new colour theme
                curTheme = Object.keys(palette)[0];

                // modify the colour palette to contain the most contrasting colours
                var n = chains[tmpChildren[i].id].length+1; // + 1 to include the base node (this child)
                var tmp_palette = [];
                if (n == 1) { // if there's only one item in this chain, set it to a bright colour (not the darkest)
                    tmp_palette.push(palette[curTheme][7]);
                }
                else {
                    for (var j = 8; j >= 0; j -= Math.floor(9/n)) {
                        tmp_palette.push(palette[curTheme][j]);
                    }
                }
                palette[curTheme] = tmp_palette;

                // colour child
                _colourTree(vizObj, chains, tmpChildren[i], palette, colour_assignment, curTheme)
            }
        }

        return colour_assignment;
    }

    /*
    * function to reorder the tree according to the genotypes' emergent cellular prevalence values
    * @param {Object} vizObj
    * @param {Object} curNode -- current node in the tree
    */
    function _reorderTree(vizObj, curNode) {

        // if the current node has children
        if (curNode.children.length >= 1) {

            // reorder the children according to their emergent cellular prevalence
            var tmpChildren = $.extend([], curNode.children);
            tmpChildren.sort(function(a, b) {return vizObj.data.emergence_values[a.id] - vizObj.data.emergence_values[b.id]});
            curNode.children = $.extend([], tmpChildren);

            // for each child
            for (var i = 0; i < curNode.children.length; i++) {

                // colour child
                _reorderTree(vizObj, curNode.children[i]);
            }
        }
    };

    /* function to get a colour palette
    */
    function _getColourPalette() {

        var colours = {
            "Greys" : ($.extend([], colorbrewer.Greys[9])),
            "Purples" : ($.extend([], colorbrewer.Purples[9])),
            "Blues" : ($.extend([], colorbrewer.Blues[9])),
            "Greens" : ($.extend([], colorbrewer.Greens[9])),
            "Oranges" : ($.extend([], colorbrewer.Oranges[9])),
            "Reds" : ($.extend([], colorbrewer.Reds[9])),
            "Turquoises" : ["#003528", "#00644B", "#008564", "#00A77D", "#00E4AB", "#00FBBC", "#13FFC4", "#44FACC", "#8AFFE2"].reverse(),
            "Pinks" : ["#51001D", "#730027", "#AB003A", "#F00051", "#FF0056", "#FF246E", "#FF5C93", "#FF98BB", "#FFD9E6"].reverse()
        }

        return colours;
    }


    /* function to calculate and return a path representing a horizontal line through the centre of the timesweep svg 
    */
    function _centreLine() {
        var tsSVGWidth = vizObj.view.config.tsSVGWidth; // -1 so time point guide is visible
        var tsSVGHeight = vizObj.view.config.tsSVGHeight;
        return "M 0 " + tsSVGHeight/2 + " L " + tsSVGWidth + " " + tsSVGHeight/2 + " L 0 " + tsSVGHeight/2;
    }

    /* tween function to transition to the next path ("path" in the data)
    * @param {String} type - the type of transition ("move" or otherwise - if otherwise, will move to centre line)
    * Note: situations other than "move" - could be an exit situation, where the next path is blank
    */
    function _pathTween(type) { 
        
        var precision = 4;
        return function() {
            // for an exit situation, the path to move to is a line in the centre of the timesweep svg
            var dest_path = (type == "move") ? this.__data__.path : _centreLine(); 
            var path0 = this,
                path1 = path0.cloneNode(),
                n0 = path0.getTotalLength(),
                n1 = (path1.setAttribute("d", dest_path), path1).getTotalLength();

            // Uniform sampling of distance based on specified precision.
            var distances = [0], i = 0, dt = precision / Math.max(n0, n1);
            while ((i += dt) < 1) distances.push(i);
            distances.push(1);
            // Compute point-interpolators at each distance.
            var points = distances.map(function(t) {
                var p0 = path0.getPointAtLength(t * n0),
                    p1 = path1.getPointAtLength(t * n1);
                return d3.interpolate([p0.x, p0.y], [p1.x, p1.y]);
            });
            return function(t) {
                return t < 1 ? "M" + points.map(function(p) { return p(t); }).join("L") : dest_path;
            };
        };
    }

    /*
    * function to, using the order of genotype emergence and the tree hierarchy, get the vertical
    * stacking order of the genotypes
    * -- ensures that the *later* children emerge, the *closer* they are to their parent in the stack
    * @param {Object} timesweep_data -- timesweep data
    * @param {Array} emergence_values -- values of genotype emergence
    * @param {Array} gTypeStackOrder -- originally empty array of the final vertical stacking order
    */
    function _vStackOrder(curNode, emergence_values, gTypeStackOrder) {
        // add the current node id to the final vertical stacking order
        gTypeStackOrder.push(curNode.id);

        // if the current node has children to search through
        if (curNode.children.length > 0) {

            // get emergence value of children
            var child_emerg_vals = [];
            for (i=0; i<curNode.children.length; i++) {
                var emerg_val = emergence_values[curNode.children[i].id];
                child_emerg_vals.push([curNode.children[i].id, emerg_val]);
            }
            var sorted_children = _sort2DArrByValue(child_emerg_vals).reverse();

            // in the *reverse* order of emergence values, search children
            sorted_children.map(function(child) {
                var child_obj = _.findWhere(curNode.children, {id: child});
                _vStackOrder(child_obj, emergence_values, gTypeStackOrder);
            })
        } 
    }

    /* function to get the cellular prevalence value for each genotype at its emergence
    * @param {Object} vizObj
    */
    function _getEmergenceValues(vizObj) {
        var cp_data = vizObj.data.cp_data;
        var emergence_values = {};

        // for each time point
        vizObj.data.timepoints.forEach(function(tp) { 

            // get genotypes
            var gtypes = Object.keys(cp_data[tp]); 

            // add genotypes if not present already
            $.each(gtypes, function(idx, g) {
                if (Object.keys(emergence_values).indexOf(g) == -1) { 
                    emergence_values[g] = cp_data[tp][g];
                }
            })
        });

        return emergence_values;
    };

    /* function to create a stack element (a genotype interval at a particular time point)
    * @param {Object} gTypeStacks -- for each time point, all of the genotypes present and their cellular prevalences
    * @param {String} tp -- time point of interest
    * @param {String} gtype -- genotype of interest
    * @param {Number} bottom_val -- value for the bottom of the interval
    * @param {Number} top_val -- value for the top of the interval
    * @param {String} state -- state of the genotype at this time point (e.g. "emerges", "present", "disappears")
    */
    function _createStackElement(gTypeStacks, tp, gtype, bottom_val, top_val, state) {
        // create the time point in the stack if it doesn't already exist
        gTypeStacks[tp] = gTypeStacks[tp] || {}; 

        // create the genotype in the stack
        gTypeStacks[tp][gtype] = {
            "bottom": bottom_val,
            "top": top_val,
            "top_no_descendants": top_val, // the top of this genotype, without including its descendants
            "state": state
        };
    }

    /* function to get cellular prevalences for each genotype in a stack, one stack for each time point
    * @param {Object} vizObj
    */
    function _getGenotypeStacks(vizObj) {
        var gTypeStacks = {},
            cp_data = vizObj.data.cp_data,
            timepoints = vizObj.data.timepoints,
            gTypeStackOrder = vizObj.data.gTypeStackOrder,
            replaced_gtypes = {}; 

        // for each timepoint (in order)...
        $.each(timepoints, function(tp_idx, tp) { 

            gTypeStacks[tp] = gTypeStacks[tp] || {}; // stack for this time point (may already be created if disappearance occurs at this time point)
            var cp = cp_data[tp]; // cellular prevalence data for this time point
            var sHeight = 0; // current height of the stack
            var prev_tp = timepoints[tp_idx-1];
            var next_tp = timepoints[tp_idx+1];

            // ... for each genotype ...
            $.each(gTypeStackOrder, function(gtype_idx, gtype) { 
                var curDescendants = vizObj.data.treeDescendantsArr[gtype];
                var gTypeAndDescendants = ($.extend([], curDescendants)); 
                gTypeAndDescendants.push(gtype); // genotype and descendants
                var curAncestors = vizObj.data.treeAncestorsArr[gtype]; // all ancestors of current genotype
                var gTypes_curTP = Object.keys(cp_data[tp]); // genotypes with cp data at the CURRENT time point
                var gTypes_nextTP = (cp_data[next_tp]) ? Object.keys(cp_data[next_tp]) : undefined; // genotypes with cp data at the NEXT time point
                var width = (cp[gtype]) ? cp[gtype] : 0; // the cp as the width to add for this genotype at this timepoint


                // if this genotype or any descendants EMERGE at this time point
                if ((_getIntersection(gTypeAndDescendants, gTypes_curTP).length == 0) &&
                    (gTypes_nextTP && _getIntersection(gTypeAndDescendants, gTypes_nextTP).length > 0)) {

                    // create the stack element as emerging
                    _createStackElement(gTypeStacks, tp, gtype, 0, 0, "emerges");

                }

                // if this genotype is REPLACED by any descendant at this time point
                else if (!cp_data[tp][gtype] && (_getIntersection(curDescendants, gTypes_curTP).length > 0)) {
                    _createStackElement(gTypeStacks, tp, gtype, sHeight, sHeight, "replaced");
                    replaced_gtypes[gtype] = replaced_gtypes[gtype] || [];
                    replaced_gtypes[gtype].push(tp);
                }

                // if neither this genotype nor any descendants are present at this time point (they DISAPPEAR)
                else if (!cp_data[tp][gtype] && _getIntersection(gTypeAndDescendants, gTypes_curTP).length == 0) {
                    var disappearance_point = sHeight;
                    _createStackElement(gTypeStacks, tp, gtype, disappearance_point, disappearance_point, "disappears_stretched");
                }

                // if this genotype or any descendants EXIST at this time point
                else if (_getIntersection(gTypeAndDescendants, gTypes_curTP).length > 0) {

                    // in case of reemergence, remove it from the "replaced genotypes" object
                    delete replaced_gtypes[gtype]; 

                    // create it as present
                    _createStackElement(gTypeStacks, tp, gtype, sHeight, sHeight + width, "present");
                    var midpoint = (gTypeStacks[tp][gtype]["bottom"] + gTypeStacks[tp][gtype]["top"])/2;

                    // update stack height
                    sHeight = gTypeStacks[tp][gtype]["top"];

                    // if it EMERGED at the previous time point
                    if (cp_data[prev_tp] && gTypeStacks[prev_tp][gtype] && gTypeStacks[prev_tp][gtype]["state"] == "emerges") {

                        // update its emergence y-value
                        _createStackElement(gTypeStacks, prev_tp, gtype, midpoint, midpoint, "emerges");
                    }

                    // update ancestors to incorporate the current genotype's stack interval
                    for (var i = 0; i < curAncestors.length; i++) {

                        // if the ancestor has not been replaced by its descendants
                        if (gTypeStacks[tp][curAncestors[i]] && 
                            (!replaced_gtypes[curAncestors[i]] || // (either not in replaced list ...
                            (replaced_gtypes[curAncestors[i]].length == 1))) {  // ... or has just been replaced at current time point)

                            // update PRESENCE in this time point (increase "top" value)
                            gTypeStacks[tp][curAncestors[i]]["top"] += width;
                            var ancestor_midpoint = (gTypeStacks[tp][curAncestors[i]]["top"] + gTypeStacks[tp][curAncestors[i]]["bottom"])/2;

                            // update EMERGENCE in previous time point (y-coordinate)
                            if (cp_data[prev_tp] && gTypeStacks[prev_tp][curAncestors[i]] && gTypeStacks[prev_tp][curAncestors[i]]["state"] == "emerges") {
                                _createStackElement(gTypeStacks, prev_tp, curAncestors[i], ancestor_midpoint, ancestor_midpoint, "emerges");
                            }
                        }
                    }
                }
            })
        })

        return gTypeStacks;
    }

    /* function to get the intersection of two arrays
    * @param {Array} array1 -- first array
    * @param {Array} array2 -- second array
    */
    function _getIntersection(array1, array2) {
        return array1.filter(function(n) {
            return array2.indexOf(n) != -1
        });
    }

    /* function to get cellular prevalence labels for each genotype at each time point, for traditional timesweep view
    * @param {Object} vizObj
    */
    function _getTraditionalCPLabels(vizObj) {
        var gTypeStacks = (dim.centredView) ? vizObj.data.layout : vizObj.data.gTypeStacks;

        var labels = [];

        // for each time point
        Object.keys(gTypeStacks).forEach(function(tp, tp_idx) {
            if (tp != "N") {

                // for each genotype
                Object.keys(gTypeStacks[tp]).forEach(function(gtype, gtype_idx) {

                    if (gtype != "Root") {

                        // data for this genotype at this time point
                        var data = gTypeStacks[tp][gtype];

                        // if the genotype exists at this time point (isn't emerging or disappearing / replaced)
                        if (data.bottom != data.top_no_descendants) {

                            // add its information 
                            var label = {};

                            if (dim.centredView) { // centred view
                                label['tp'] = tp;
                                label['gtype'] = gtype;
                                label['cp'] = data.cp;
                                label['top'] = data.top;
                                label['bottom'] = data.top - (data.cp/2);
                                label['middle'] = data.top - (data.cp/4);
                                label['type'] = "traditional";
                            }
                            else { // stacked view
                                label['tp'] = tp;
                                label['gtype'] = gtype;
                                label['cp'] = data.top_no_descendants-data.bottom;
                                label['top'] = data.top_no_descendants;
                                label['bottom'] = data.bottom;
                                label['middle'] = (data.top_no_descendants + data.bottom)/2;
                                label['type'] = "traditional";
                            }
                            
                            labels.push(label);

                        }
                    }
                    
                })
            }
        });

        return labels;
    }

    /* function to get cellular prevalence lables for each genotype at each time point, for separate timesweep view
    * @param {Object} vizObj
    */
    function _getSeparateCPLabels(vizObj) {
        var separate_paths = vizObj.data.separate_paths;

        var labels = [];

        // for each genotype
        for (var i = 0; i < separate_paths.length; i++) {
            var gtype = separate_paths[i]["gtype"];
            var midpoint = separate_paths[i]["midpoint"];
            var path = separate_paths[i]["path"];

            // for each point in the path
            for (var j = 0; j < path.length; j++) {
                var cp = path[j]["cp"];
                var tp = path[j]["tp"];

                if (tp != "N") {

                    // if the genotype exists at this time point (isn't emerging or disappearing / replaced)
                    if (cp) {
                        var label = {};
                        label['tp'] = tp;
                        label['cp'] = cp;
                        label['middle'] = midpoint;
                        label['gtype'] = gtype;
                        label['type'] = "separate";
                        labels.push(label);
                    }
                }
            }
        }

        return labels;
    }

    /* function to find the ancestors of the specified genotype that emerge at a particular time point
    * @param {Object} gTypeStacks -- for each time point, the interval boundaries for each genotype in the stack at that time point
    * @param {Object} treeAncestorsArr -- for each genotype (properties), an array of their ancestors (values)
    * @param {String} gtype -- the genotype of interest
    * @param {String} tp -- the time point of interest
    */
    function _findEmergentAncestors(gTypeStacks, treeAncestorsArr, gtype, tp) {
        var ancestors = [];

        // for each ancestral genotype, 
        for (var i = 0; i < treeAncestorsArr[gtype].length; i++) {
            var pot_ancestor = treeAncestorsArr[gtype][i]

            // if this ancestor emerged here as well, increase the # ancestors for this genotype
            if (gTypeStacks[tp][pot_ancestor] && gTypeStacks[tp][pot_ancestor]["state"] == "emerges") {
                ancestors.push(pot_ancestor);
            }
        }

        return ancestors;
    }

    /* function to shift the emergence in the x-direction if multiple genotypes from the same lineage emerge at the same timepoint
    * @param {Object} vizObj
    */
    function _shiftEmergence(vizObj) {
        var gTypeStacks = (dim.centredView) ? vizObj.data.layout : vizObj.data.gTypeStacks,
            gTypeStackOrder = vizObj.data.gTypeStackOrder,
            timepoints = vizObj.data.timepoints,
            treeAncestorsArr = vizObj.data.treeAncestorsArr,
            treeDescendantsArr = vizObj.data.treeDescendantsArr;

        $.each(timepoints, function(tp_idx, tp) { 

            // --> get the number of partitions for this time point <-- //

            // for each genotype (backwards in stacking order -- descendant before ancestral)
            var nPartitions = -1;
            var gTypeStackOrder_rev = ($.extend([], gTypeStackOrder)).reverse();
            $.each(gTypeStackOrder_rev, function(gtype_idx, gtype) {

                // if the genotype is emerging at this time point
                if (gTypeStacks[tp][gtype] && (gTypeStacks[tp][gtype]["state"] == "emerges")) {
                    
                    // get the ancestors that also emerge at this time point
                    var ancestors = _findEmergentAncestors(gTypeStacks, treeAncestorsArr, gtype, tp);
                    var curNPartitions = ancestors.length+2;

                    // if this is the largest number of ancestors so far, update the number of partitions
                    if (curNPartitions > nPartitions) {
                        nPartitions = curNPartitions;
                    }

                }

            })

            // --> x-shift genotypes <-- //

            // keep track of which genotypes have been x-shifted
            var genotypes_xshifted = [];

            // for each genotype (backwards in stacking order -- descendant before ancestral)
            $.each(gTypeStackOrder_rev, function(gtype_idx, gtype) {
                
                // if this genotype has not already been x-shifted and emerges at this time point
                if ((genotypes_xshifted.indexOf(gtype) == -1) && gTypeStacks[tp][gtype] && (gTypeStacks[tp][gtype]["state"] == "emerges")) {

                    // get the ancestors that also emerge at this time point
                    var ancestors = _findEmergentAncestors(gTypeStacks, treeAncestorsArr, gtype, tp);

                    // x-shift and x-partition for the current genotype (depends on how many of its ancestors emerge)
                    gTypeStacks[tp][gtype]["xShift"] = (ancestors.length+1) / nPartitions;
                    gTypeStacks[tp][gtype]["nPartitions"] = nPartitions;

                    genotypes_xshifted.push(gtype);

                    // for each ancestor that also emerged at this time point
                    for (var i = 0; i < ancestors.length; i++) {

                        // find the ancestor's ancestors that also emerge at this time point
                        var ancestors_of_ancestor = _findEmergentAncestors(gTypeStacks, treeAncestorsArr, ancestors[i], tp);
                        
                        // x-shift and x-partition for the current ancestor (depends on how many of its ancestors emerge)
                        gTypeStacks[tp][ancestors[i]]["xShift"] = (ancestors_of_ancestor.length+1) / nPartitions;
                        gTypeStacks[tp][ancestors[i]]["nPartitions"] = nPartitions;

                        genotypes_xshifted.push(ancestors[i]);
                    }
                }
            })
        })
    }

    /* function to convert genotype stacks at each time point into a list of moves for each genotype's d3 path object (traditional timesweep view)
    * Note: the appearance timepoint is the time at which the genotype appears in the dataset
    *       the emergence timepoint is the time at which the genotype must have emerged (appearance timepoint - 1)
    * @param {Object} vizObj
    */
    function _getTraditionalPaths(vizObj) {
        var gTypeStacks = (dim.centredView) ? vizObj.data.layout : vizObj.data.gTypeStacks,
            timepoints = vizObj.data.timepoints,
            gTypeStackOrder = vizObj.data.gTypeStackOrder;

        var paths = [];
        $.each(gTypeStackOrder, function(gtype_idx, gtype) {

            // path for the current genotype
            var cur_path = {"gtype": gtype, "path":[]};
            
            // for each time point (in sequence)...
            $.each(timepoints, function(idx, tp) {
                if (gTypeStacks[tp][gtype]) {
                    var emerges = (gTypeStacks[tp][gtype]["state"] == "emerges"),
                        xShift = gTypeStacks[tp][gtype]["xShift"],
                        nPartitions = gTypeStacks[tp][gtype]["nPartitions"],
                        appear_tp = timepoints[idx+1],
                        end_tp = timepoints[idx-1];

                    // ... add a path point for the bottom of the genotype's interval at the current time point
                    var xBottom = null;
                    if (emerges) {
                        xBottom = (idx + xShift)/(timepoints.length-1);
                    } 
                    else {
                        xBottom = (idx)/(timepoints.length-1);
                    }
                    cur_path["path"].push({ "x": xBottom, 
                                            "y": gTypeStacks[tp][gtype]["bottom"]});

                    // ... if the current genotype emerges at the current time point... 
                    if (emerges) {
                        // ... add a path point to expand the sweep such that its descendants can be contained within it
                        var appear_xBottom = (idx + xShift + (1/nPartitions))/(timepoints.length-1);
                        cur_path["path"].push({ "x": appear_xBottom, 
                                            "y": gTypeStacks[appear_tp][gtype]["bottom"]}); // y-coordinate at next time point
                    }                   
                }
            })

            // for each time point (in *reverse* sequence)...
            var timepoints_rev = ($.extend([], timepoints)).reverse();
            $.each(timepoints_rev, function(idx, tp) {
                if (gTypeStacks[tp][gtype]) {
                    var emerges = (gTypeStacks[tp][gtype]["state"] == "emerges"),
                        nPartitions = gTypeStacks[tp][gtype]["nPartitions"],
                        xShift = gTypeStacks[tp][gtype]["xShift"],
                        appear_tp = timepoints_rev[idx-1],
                        end_tp = timepoints_rev[idx+1];

                    // ... if the current genotype emerges at the current time point...
                    if (emerges) {
                        // ... add a path point to bring forward the sweep such that its descendants can be contained within it
                        var appear_xTop = ((timepoints.length-1) - idx + xShift + (1/nPartitions))/(timepoints.length-1);
                        cur_path["path"].push({ "x": appear_xTop, 
                                            "y": gTypeStacks[appear_tp][gtype]["top"]}); // y-coordinate at next time point
                    }   

                    // ... add a path point for the top of the genotype's interval at the current time point
                    var xTop = null;
                    if (emerges) {
                        xTop = ((timepoints.length-1) - idx + xShift)/(timepoints.length-1);
                    }
                    else {
                        xTop = ((timepoints.length-1) - idx)/(timepoints.length-1);
                    }
                    cur_path["path"].push({ "x": xTop, 
                                            "y": gTypeStacks[tp][gtype]["top"]});
                }
            })
            
            // add the path for this genotype to the list of all paths to plot
            paths.push(cur_path);
        })

        return paths;
    }

    /* function to convert genotype stacks at each time point into a list of moves for each genotype's d3 path object (separate paths timesweep view)
    * Note: the appearance timepoint is the time at which the genotype appears in the dataset
    *       the emergence timepoint is the time at which the genotype must have emerged (appearance timepoint - 1)
    * @param {Object} vizObj
    */
    function _getSeparatePaths(vizObj) {
        var timepoints = vizObj.data.timepoints,
            gTypeStackOrder = vizObj.data.gTypeStackOrder,
            genotype_cp = vizObj.data.genotype_cp,
            gTypeStacks = (dim.centredView) ? vizObj.data.layout : vizObj.data.gTypeStacks,
            padding = 0.03,
            ts_sep_labels = vizObj.data.ts_sep_labels,
            paths = [];

        // find the denominator (total height of the view), in terms of the sweeps (sum of largest cp for each genotype)
        var largest_cps = {};
        Object.keys(genotype_cp).forEach(function(gtype, gtype_idx) {
            if (gtype != "Root") {
                var cps = Object.keys(genotype_cp[gtype]).map(function (key) { return genotype_cp[gtype][key]; });
                largest_cps[gtype] = Math.max(...cps);
            }
        })
        var denominator = Object.keys(largest_cps).map(function (key) { return largest_cps[key]; }).reduce(function(a, b) {
            return a + b;
        }); 
        var full_padding = padding * (Object.keys(largest_cps).length+1); // one padding between each genotype (including one above, one below)
        denominator += full_padding;

        // for each genotype, get its path through the time points
        var sHeight = 0,
            seenGTypes = [];
        $.each(gTypeStackOrder, function(gtype_idx, gtype) {

            if (Object.keys(largest_cps).indexOf(gtype) != -1) {

                // scaled midpoint for this genotype's timesweep band
                var scaled_midpoint = (largest_cps[gtype] / denominator)/2 + sHeight;
                scaled_midpoint += ((seenGTypes.length)/(Object.keys(largest_cps).length+1)) * full_padding/denominator; // padding

                // path for the current genotype
                var cur_path = {"gtype": gtype, "midpoint": scaled_midpoint, "path":[]};
                
                // BOTTOM COORDINATE for each time point 
                $.each(timepoints, function(tp_idx, tp) {

                    // xShift info
                    var entry_exit_options = ["disappears_stretched", "emerges", "replaced"];
                    var entry_exit = (gTypeStacks[tp][gtype]) ? (entry_exit_options.indexOf(gTypeStacks[tp][gtype]["state"]) != -1) : false;
                    var xShift = (gTypeStacks[tp][gtype] && gTypeStacks[tp][gtype]["xShift"]) ? gTypeStacks[tp][gtype]["xShift"] : 0;

                    if (entry_exit || genotype_cp[gtype][tp]) {
                        // add this genotype to the seen genotypes
                        if (seenGTypes.indexOf(gtype) == -1) {
                            seenGTypes.push(gtype);
                        }

                        // add the path point
                        var x = (tp_idx + xShift)/(timepoints.length-1);
                        var y = genotype_cp[gtype][tp] ? scaled_midpoint - (genotype_cp[gtype][tp] / denominator)/2 : scaled_midpoint;
                        cur_path["path"].push({ "x": x, "y": y, "tp": tp, "cp": genotype_cp[gtype][tp]});
                    }
                });

                // TOP COORDINATE for each time point (in *reverse* sequence)...
                var timepoints_rev = ($.extend([], timepoints)).reverse();
                $.each(timepoints_rev, function(tp_idx, tp) {

                    // xShift info
                    var entry_exit_options = ["disappears_stretched", "emerges", "replaced"];
                    var entry_exit = (gTypeStacks[tp][gtype]) ? (entry_exit_options.indexOf(gTypeStacks[tp][gtype]["state"]) != -1) : false;
                    var xShift = (gTypeStacks[tp][gtype] && gTypeStacks[tp][gtype]["xShift"]) ? gTypeStacks[tp][gtype]["xShift"] : 0;

                    // add the path point
                    if (entry_exit || genotype_cp[gtype][tp]) {
                        var x = ((timepoints.length-1) - tp_idx + xShift)/(timepoints.length-1);
                        var y = genotype_cp[gtype][tp] ? scaled_midpoint + (genotype_cp[gtype][tp] / denominator)/2 : scaled_midpoint;
                        cur_path["path"].push({ "x": x, "y": y, "tp": tp, "cp": genotype_cp[gtype][tp]});
                    }
                });
                
                // add the path for this genotype to the list of all paths to plot
                paths.push(cur_path);

                // update the stack height
                sHeight += largest_cps[gtype]/denominator;
            }
        })

        return paths;
    }

    /* function to convert straight paths for each genotype to bezier curve paths
    * @param {Object} paths -- straight path for each genotype
    * @param {Number} tsSVGWidth -- width of the timesweep svg
    * @param {Number} tsSVGHeight -- height of the timesweep svg
    */
    function _getBezierPaths(paths, tsSVGWidth, tsSVGHeight) {

        var bezier_paths = [];

        // for each genotype's path
        $.each(paths, function(path_idx, cur_path) { 

            var path = cur_path['path'];
            var bezier_path = "";

            // for each point in the path, get its diagonal to the next point
            for (var i = 0; i < path.length-1; i++) {
                var xsource = path[i].x * tsSVGWidth,
                    xtarget = path[i+1].x * tsSVGWidth,
                    ysource = (1-path[i].y) * tsSVGHeight,
                    ytarget = (1-path[i+1].y) * tsSVGHeight;

                // diagonal line generator for bezier curve between two points
                var diagonal = d3.svg.diagonal()
                    .source(function() { return {"y": xsource, "x": ysource }; })
                    .target(function() { return {"y": xtarget, "x": ytarget};})
                    .projection(function(d) { return [d.y, d.x] });

                // for this genotype, append the bezier curve connecting this point and the next 
                bezier_path = (i == 0) ? bezier_path + diagonal() : bezier_path + "L" + diagonal().substring(1);
            }

            bezier_paths.push({"gtype": cur_path['gtype'], "path": bezier_path});
        })

        return bezier_paths;
    }

    /* function to sort a 2D array by the second value in each contained array, 
    * @returns the sorted first elements of each contained array 
    */
    function _sort2DArrByValue(obj)
    {
        // sort items by value
        obj.sort(function(a, b)
        {
            var x=a[1],
                y=b[1];
            return x<y ? -1 : x>y ? 1 : 0;
        });

        // get first element of each contained array
        first_elements = [];
        for(var i=0; i<obj.length; i++) {
            first_elements.push(obj[i][0]);
        }

        return first_elements; 
    }

    /* function to capitalize each word in a string
    * @param {String} str -- string to capitalize
    */
    function _toTitleCase(str)
    {
        return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    }

    /* function to move value from one place to another in an array
    * @param {array} array - array within which the move will take place
    * @param {int} oldIndex - location in array to move from
    * @param {int} newIndex - location in array to move to
    */
    function _move(array, oldIndex, newIndex) {
        if (newIndex >= array.length) {
            newIndex = array.length - 1;
        }
        array.splice(newIndex, 0, array.splice(oldIndex, 1)[0]);
        return array;
    }



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
    
    // FUNCTIONS

    /* function to convert straight paths for each genotype to bezier curve paths
    * @param {Object} paths -- straight path for each genotype
    * @param {Number} tsSVGWidth -- width of the timesweep svg
    * @param {Number} tsSVGHeight -- height of the timesweep svg
    */
    function _getBezierPaths(paths, tsSVGWidth, tsSVGHeight) {

        var bezier_paths = [];

        // for each genotype's path
        $.each(paths, function(path_idx, cur_path) { 

            var path = cur_path['path'];
            var bezier_path = "";

            // for each point in the path, get its diagonal to the next point
            for (var i = 0; i < path.length-1; i++) {
                var xsource = path[i].x * tsSVGWidth,
                    xtarget = path[i+1].x * tsSVGWidth,
                    ysource = (1-path[i].y) * tsSVGHeight,
                    ytarget = (1-path[i+1].y) * tsSVGHeight;

                // diagonal line generator for bezier curve between two points
                var diagonal = d3.svg.diagonal()
                    .source(function() { return {"y": xsource, "x": ysource }; })
                    .target(function() { return {"y": xtarget, "x": ytarget};})
                    .projection(function(d) { return [d.y, d.x] });

                // for this genotype, append the bezier curve connecting this point and the next 
                bezier_path = (i == 0) ? bezier_path + diagonal() : bezier_path + "L" + diagonal().substring(1);
            }

            bezier_paths.push({"gtype": cur_path['gtype'], "path": bezier_path});
        })

        return bezier_paths;
    }
   
    return {}
    
  }

});
