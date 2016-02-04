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
        fontSize: 11,
        circleR: 20,
        rootColour: '#DDDADA',
        threshold: 0.005 // cellular prevalence threshold of visual detection
    };

    // global variable vizObj
    vizObj = {};
    vizObj.data = {};
    vizObj.view = {};

    // set configurations
    var config = $.extend(true, {}, defaults);
    vizObj.view.config = config;
    var dim = vizObj.view.config;

    dim.width = width;
    dim.height = height;
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

    return {}
    
  },

  renderValue: function(el, x, instance) {
    var dim = vizObj.view.config;

    // get params from R
    vizObj.view.userConfig = x;
    vizObj.view.userConfig.showRoot = (x.show_root == "T") ? true : false; // whether or not to show the root in the view
    vizObj.view.userConfig.sort_gtypes = (x.sort == "T") ? true : false; // whether or not to vertically sort the genotypes based on emergence values
    vizObj.data.perturbations = x.perturbations;
    vizObj.data.patient_id = x.patient; // patient id

    // GET CONTENT

    // extract all info from tree about nodes, edges, ancestors, descendants
    _getTreeInfo(vizObj);

    // get timepoints, prepend a "T0" timepoint to represent the timepoint before any data originated
    var timepoints = _.uniq(_.pluck(x.clonal_prev, "timepoint"));
    timepoints.unshift("T0");
    vizObj.data.timepoints = timepoints;

    // get cellular prevalence info
    _getCPData(vizObj);

    // get emergence values for each genotype
    vizObj.data.emergence_values = _getEmergenceValues(vizObj);

    // convert time-centric cellular prevalence data into genotype-centric cellular prevalence data
    _getGenotypeCPData(vizObj);

    // get the layout of the traditional timesweep
    _getLayout(vizObj);

    // get paths for plotting
    _getPaths(vizObj);

    // get cellular prevalence labels
    vizObj.data.ts_trad_labels = _getTraditionalCPLabels(vizObj);
    vizObj.data.ts_sep_labels = _getSeparateCPLabels(vizObj);

    // SET CONTENT

    // get colour scheme
    _getColours(vizObj);
    var colour_assignment = vizObj.view.colour_assignment,
        alpha_colour_assignment = vizObj.view.alpha_colour_assignment;

    // plot timesweep data
    var patientID_class = 'patientID_' + vizObj.data.patient_id;
    vizObj.view.tsSVG
        .selectAll('.tsPlot')
        .data(vizObj.data.bezier_paths, function(d) {
            return d.gtype;
        })
        .enter().append('path')
        .attr('class', function() { return 'tsPlot ' + patientID_class; })
        .attr('d', function(d) { return d.path; })
        .attr('fill', function(d) { 
            return (x.alpha == "NA") ? colour_assignment[d.gtype] : alpha_colour_assignment[d.gtype];
        }) 
        .attr('stroke', function(d) { 
            return (d.gtype == "Root" && vizObj.view.userConfig.showRoot) ? dim.rootColour : colour_assignment[d.gtype]; 
        })
        .attr('fill-opacity', function(d) {
            return (d.gtype == "Root" && !vizObj.view.userConfig.showRoot) ? 0 : 1;
        })
        .attr('stroke-opacity', function(d) {
            return (d.gtype == "Root" && !vizObj.view.userConfig.showRoot) ? 0 : 1;
        })
        .on('click', function() { 
            return _sweepClick(vizObj); 
        })
        .on('mouseover', function(d) {
            return _sweepMouseover(d, vizObj);
        })
        .on('mouseout', function(d) {
            return _sweepMouseout(d, vizObj)
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
        .attr('stroke', 'grey')
        .attr('stroke-opacity', '0')
        .attr('stroke-width', '1.5px')
        .style('pointer-events', 'none');

    // plot cellular prevalence labels at each time point - traditional timesweep view 
    var labels = vizObj.data.ts_trad_labels.concat(vizObj.data.ts_sep_labels);

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
            if ((dim.tsSVGHeight-(d.middle*dim.tsSVGHeight)) < dim.circleR) {
                return 1 + dim.circleR;
            }

            // ... is cut off at the bottom, shift up
            else if ((d.middle*dim.tsSVGHeight) < dim.circleR) {
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
            var cp = (Math.round(d.cp * 100) / 1);
            if (cp == 0) {
                return "< 1";
            }
            return cp.toString();
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
            if ((dim.tsSVGHeight-(d.middle*dim.tsSVGHeight)) < dim.circleR) {
                d3.select(this).attr('y', 1 + dim.circleR);
            }

            // ... is cut off at the bottom, shift up
            else if ((d.middle*dim.tsSVGHeight) < dim.circleR) {
                d3.select(this).attr('y', dim.tsSVGHeight - 1 - dim.circleR);
            }

            // ... is not cut off, center vertically
            return '.35em';
        })
        .attr('fill', 'black')
        .attr('opacity', 0)
        .attr('text-anchor', 'middle')
        .style('pointer-events', 'none');


    // PLOT PERTURBATIONS INFO

    // plot labels
    vizObj.view.xAxisSVG
        .selectAll('.pertLabel')
        .data(vizObj.data.perturbations)
        .enter().append('text')
        .attr('class', 'pertLabel')
        .attr('x', function(d) { 
            var prevTP_idx = vizObj.data.timepoints.indexOf(d.prev_tp);
            return ((prevTP_idx + 0.5) / (vizObj.data.timepoints.length-1)) * (dim.tsSVGWidth) + dim.smallMargin + dim.yAxisWidth; 
        })
        .attr('y', 0)
        .attr('dy', '.71em')
        .attr('text-anchor', 'middle')
        .attr('font-family', 'sans-serif')
        .attr('font-size', '11px')
        .text(function(d) { return d.pert_name; })
        .on('mouseover', function(d) {
            d3.selectAll(".pertGuide.pert_" + d.pert_name + '.' + patientID_class).attr('stroke-opacity', 1); 
        })
        .on('mouseout', function(d) {
            d3.selectAll(".pertGuide.pert_" + d.pert_name + '.' + patientID_class).attr('stroke-opacity', 0);
        });

    // plot guides
    vizObj.view.tsSVG
        .selectAll('.pertGuide')
        .data(vizObj.data.perturbations)
        .enter().append('line')
        .attr('class', function(d) { return 'pertGuide pert_' + d.pert_name + ' ' + patientID_class; })
        .attr('x1', function(d) { 
            var prevTP_idx = vizObj.data.timepoints.indexOf(d.prev_tp);
            return ((prevTP_idx + 0.5) / (vizObj.data.timepoints.length-1)) * (dim.tsSVGWidth); 
        })
        .attr('x2', function(d) { 
            var prevTP_idx = vizObj.data.timepoints.indexOf(d.prev_tp);
            return ((prevTP_idx + 0.5) / (vizObj.data.timepoints.length-1)) * (dim.tsSVGWidth); 
        })
        .attr('y1', 0)
        .attr('y2', dim.tsSVGHeight)
        .attr('stroke', 'grey')
        .attr('stroke-opacity', '0')
        .attr('stroke-width', '1.5px')
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
            return x.yaxis_title;
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
            return x.xaxis_title;
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
        .attr('fill', function(d) { return alpha_colour_assignment[d]; })
        .attr('stroke', function(d) { return colour_assignment[d]; });

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
    var treePadding = 20,
        treeTitleHeight = d3.select('.treeTitle').node().getBBox().height,
        treeLayout = d3.layout.tree()           
            .size([dim.treeHeight - treePadding - treeTitleHeight, dim.treeWidth - treePadding]); 

    // get nodes and links
    var root = $.extend({}, vizObj.data.treeStructure), // copy tree into new variable
        nodes = treeLayout.nodes(root), 
        links = treeLayout.links(nodes);   
 
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
            return alpha_colour_assignment[d.id];
        })
        .attr('stroke', function(d) {
            return colour_assignment[d.id];
        })
        .attr("id", function(d) { return d.sc_id; })
        .attr("r", 4)
        .append("title")
        .text(function(d) { return d.id; });
  },

  resize: function(el, width, height, instance) {

    var dim = vizObj.view.config;

    dim.width = width;
    dim.height = height;
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

    // if we want the spaced stacked view, recalculate the layout
    var deferred = new $.Deferred();
    if (!vizObj.view.userConfig.genotype_position) {
        // get the layout of genotypes at each time point
        _getLayout(vizObj, vizObj.view.userConfig.genotype_position);

        // in the layout, shift x-values if >1 genotype emerges at the 
        // same time point from the same clade in the tree
        _shiftEmergence(vizObj)
        
        // convert layout at each time point into a list of moves for each genotype's d3 path object
        vizObj.data.traditional_paths = _getTraditionalPaths(vizObj);

        // get cellular prevalence labels
        vizObj.data.ts_trad_labels = _getTraditionalCPLabels(vizObj);
    }

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
