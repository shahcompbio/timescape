HTMLWidgets.widget({

  name: 'timesweep',

  type: 'output',

  initialize: function(el, width, height) {
    

    // defaults
    var defaults = {
        paddingGeneral: 15,
        legendWidth: 110,
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
        threshold: 0.005, // cellular prevalence threshold of visual detection
        legendGtypeHeight: 13, // height for each genotype in the legend
        clonalTrajectoryLabelHeight: 42,
        curCloneIDs: [], // array of clone ids currently in the mutation table
        nClickedNodes: 0, // number of clicked nodes
        phantomRoot: "phantomRoot",
        treeLinkColour: "black"
    };

    // global variable vizObj
    vizObj = {};
    var view_id = el.id;
    vizObj[view_id] = {};
    curVizObj = vizObj[view_id];
    curVizObj.data = {};
    curVizObj.view = {};

    // set configurations
    var config = $.extend(true, {}, defaults);
    curVizObj.generalConfig = config;
    var dim = curVizObj.generalConfig;

    dim.width = width;
    dim.height = height;

    return {}
    
  },

  renderValue: function(el, x, instance) {
    var view_id = el.id;
    var curVizObj = vizObj[view_id]; 
    curVizObj.view_id = view_id;
    var dim = curVizObj.generalConfig;

    // get params from R
    curVizObj.userConfig = x;
    curVizObj.data.perturbations = x.perturbations;

    // configuration based on available data
    dim.canvasSVGWidth = dim.width - dim.paddingGeneral - dim.paddingGeneral;
    dim.canvasSVGHeight = dim.height - dim.paddingGeneral - dim.paddingGeneral;
    dim.tsSVGHeight = (curVizObj.userConfig.mutations[0] == "NA") ? 
                        dim.canvasSVGHeight - dim.xAxisHeight - dim.smallMargin :
                        250;
    dim.tsSVGWidth = dim.canvasSVGWidth - dim.legendWidth - dim.yAxisWidth - dim.smallMargin - dim.paddingGeneral;
    dim.xAxisWidth = dim.tsSVGWidth;
    dim.yAxisHeight = dim.tsSVGHeight;
    dim.mutationTableHeight = dim.canvasSVGHeight - dim.tsSVGHeight - dim.smallMargin - 25;
    dim.mutationTableWidth = dim.tsSVGWidth;

    // adjust canvas SVG height if mutation table is present
    dim.canvasSVGHeight -= (curVizObj.userConfig.mutations[0] == "NA") ? 
                            0 : 
                            dim.mutationTableHeight;

    // SET UP PAGE LAYOUT

    var buttonDIV = d3.select(el).append("div")
        .append("button")
        .attr("type","button")
        .attr("class", "downloadButton")
        .text("Download SVG")
        .on("click", function() {
            // download the svg
            downloadSVG("timesweep_" + view_id);
        });

    var canvasDIV = d3.select(el).append("div")
        .attr("class", "div")
        .attr("id", view_id);

    curVizObj.view.mutationTableDIV = d3.select(el)
        .append("div")
        .attr("class", "mutationTableDIV")
        .style("position", "relative")
        .style("width", dim.mutationTableWidth + "px")
        .style("height", dim.mutationTableHeight + "px")
        .style("left", (dim.yAxisWidth + dim.smallMargin + dim.paddingGeneral) + "px")
        .style("float", "left");

    var canvasSVG = canvasDIV
        .append("svg:svg")  
        .attr("class", "timesweep_" + view_id)     
        .attr("x", 0)
        .attr("y", 0) 
        .attr("width", dim.canvasSVGWidth) 
        .attr("height", dim.canvasSVGHeight)
        .style("float", "left")
        .style("margin-right",  dim.paddingGeneral)
        .style("margin-left",  dim.paddingGeneral)
        .style("margin-top",  dim.paddingGeneral)
        .style("margin-bottom",  dim.paddingGeneral)
        .on("click", function() {
            _backgroundClick(curVizObj);
        });

    var tsSVG = canvasSVG
        .append("g")  
        .attr("class", "tsSVG")     
        .attr("transform", "translate(" + (dim.yAxisWidth + dim.smallMargin) + "," + 0 + ")");

    var yAxisSVG = canvasSVG
        .append("g") 
        .attr("class", "yAxisSVG")      
        .attr("transform", "translate(" + 0 + "," + 0 + ")");

    var xAxisSVG = canvasSVG
        .append("g") 
        .attr("class", "xAxisSVG")      
        .attr("transform", "translate(" + 0 + "," + (dim.tsSVGHeight + dim.smallMargin) + ")");

    var tsLegendSVG = canvasSVG
        .append("g") 
        .attr("class", "tsLegendSVG")
        .attr("transform", "translate(" + (dim.yAxisWidth + dim.smallMargin + dim.tsSVGWidth + dim.paddingGeneral) + 
            "," + 0 + ")");

    var tsTree = canvasSVG
        .append("g") 
        .attr("class", "tsTreeSVG");

    var tsSwitch = canvasSVG
        .append("g") 
        .attr("class", "tsSwitch");

    curVizObj.view.canvasSVG = canvasSVG;
    curVizObj.view.xAxisSVG = xAxisSVG;
    curVizObj.view.yAxisSVG = yAxisSVG;
    curVizObj.view.tsSVG = tsSVG;
    curVizObj.view.tsLegendSVG = tsLegendSVG;
    curVizObj.view.tsTree = tsTree;
    curVizObj.view.tsSwitch = tsSwitch;


    // GET CONTENT

    // extract all info from tree about nodes, edges, ancestors, descendants
    _getTreeInfo(curVizObj);

    // get mutation data in better format
    if (curVizObj.userConfig.mutations[0] != "NA") {
        _reformatMutations(curVizObj);

        // get column names (depending on the available data, which columns will be shown)
        dim.mutationColumns = [
                        { "data": "chrom", "title": "Chromosome" },
                        { "data": "coord", "title": "Coordinate" },
                        { "data": "empty", "title": "Clone", "bSortable": false }
                    ];
        if (curVizObj.userConfig.mutations[0].hasOwnProperty("gene_name")) {
            dim.mutationColumns.push({ "data": "gene_name", "title": "Gene Name" });
        }
        if (curVizObj.userConfig.mutations[0].hasOwnProperty("effect")) {
            dim.mutationColumns.push({ "data": "effect", "title": "Effect" });
        }
        if (curVizObj.userConfig.mutations[0].hasOwnProperty("impact")) {
            dim.mutationColumns.push({ "data": "impact", "title": "Impact" });
        } 
    }

    // move the tree SVG down by the height of the legend
    // 25 for legend title and space
    var legendHeight = curVizObj.data.treeNodes.length * dim.legendGtypeHeight + 25 + 25; 
    curVizObj.view.tsTree.attr("transform", "translate(" + 
        (dim.yAxisWidth + dim.smallMargin + dim.tsSVGWidth + dim.paddingGeneral) + ",0)");

    // move the switch SVG down by the height of the legend + height of the tree
    curVizObj.view.tsSwitch.attr("transform", "translate(" + 
        (dim.yAxisWidth + dim.smallMargin + dim.tsSVGWidth + dim.paddingGeneral) + "," + 
        (dim.tsSVGHeight - dim.clonalTrajectoryLabelHeight) + ")");

    // get timepoints, prepend a "T0" timepoint to represent the timepoint before any data originated
    var timepoints = _.uniq(_.pluck(x.clonal_prev, "timepoint"));
    timepoints.unshift("T0");
    curVizObj.data.timepoints = timepoints;

    // get cellular prevalence info
    _getCPData(curVizObj);

    // get emergence values for each genotype
    curVizObj.data.emergence_values = _getEmergenceValues(curVizObj);

    // convert time-centric cellular prevalence data into genotype-centric cellular prevalence data
    _getGenotypeCPData(curVizObj);

    // get the layout of the traditional timesweep
    _getLayout(curVizObj);

    // get paths for plotting
    _getPaths(curVizObj);

    // get cellular prevalence labels
    curVizObj.data.ts_trad_labels = _getTraditionalCPLabels(curVizObj);
    curVizObj.data.ts_sep_labels = _getSeparateCPLabels(curVizObj);

    // SET CONTENT

    // tooltip for mutation VAFs
    curVizObj.tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10,0])
        .html(function(d) {
            return "<strong>VAF:</strong> <span>" + d.VAF + "</span>";
        }); 

    // get colour scheme
    _getPhyloColours(curVizObj);
    var colour_assignment = curVizObj.view.colour_assignment,
        alpha_colour_assignment = curVizObj.view.alpha_colour_assignment;

    // plot light grey timesweep background
    curVizObj.view.tsSVG
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("height", dim.tsSVGHeight)
        .attr("width", dim.tsSVGWidth)
        .attr("fill", "#F7F7F7")
        .on("click", function() {
            _backgroundClick(curVizObj);
        });

    // plot timesweep data
    curVizObj.view.tsSVG
        .selectAll('.tsPlot')
        .data(curVizObj.data.bezier_paths, function(d) {
            return d.gtype;
        })
        .enter().append('path')
        .attr('class', function(d) { return 'tsPlot gtype_' + d.gtype; })
        .attr('d', function(d) { return d.path; })
        .attr('fill', function(d) { 
            return alpha_colour_assignment[d.gtype];
        }) 
        .attr('stroke', function(d) { 
            return colour_assignment[d.gtype]; 
        })
        .on('mouseover', function(d) {
            if (!dim.selectOn && !dim.mutSelectOn) {
                _shadeTimeSweep(curVizObj);
                _shadeLegend(curVizObj);
                _gtypeHighlight(d.gtype, curVizObj);
                _showLabels(d.gtype, curVizObj);
            }
        })
        .on('mouseout', function(d) {
            if (!dim.selectOn && !dim.mutSelectOn) {
                _resetView(curVizObj);
            }
        });

    // plot time point guides
    curVizObj.view.tsSVG
        .selectAll('.tpGuide')
        .data(curVizObj.data.timepoints)
        .enter().append('line')
        .attr('class', function(d) { return 'tpGuide tp_' + d; })
        .attr('x1', function(d, i) { return (i / (curVizObj.data.timepoints.length - 1)) * dim.tsSVGWidth; })
        .attr('x2', function(d, i) { return (i / (curVizObj.data.timepoints.length - 1)) * dim.tsSVGWidth; })
        .attr('y1', 0)
        .attr('y2', dim.tsSVGHeight)
        .attr('stroke', 'grey')
        .attr('stroke-opacity', '0')
        .attr('stroke-width', '1.5px')
        .style('pointer-events', 'none');

    // plot cellular prevalence labels at each time point - traditional timesweep view 
    var labels = curVizObj.data.ts_trad_labels.concat(curVizObj.data.ts_sep_labels);
    console.log("labels");
    console.log(labels);

    var labelG = curVizObj.view.tsSVG
        .selectAll('.gLabel')
        .data(labels)
        .enter().append('g')
        .attr('class', 'gLabel');

    labelG
        .append('circle')
        .attr('class', function(d) { 
            if (d.type == "traditional") {
                return 'labelCirc tp_' + d.tp + ' gtype_' + d.gtype; 
            }
            return 'sepLabelCirc tp_' + d.tp + ' gtype_' + d.gtype; 
        }) 
        .attr('cx', function(d) { 

            // index of this time point relative to others
            var index = curVizObj.data.timepoints.indexOf(d.tp); 

            var x_val = (index / (curVizObj.data.timepoints.length-1)) * (dim.tsSVGWidth);

            // if the time point is the last
            if (index == curVizObj.data.timepoints.length - 1) {
                // shift it to the left
                x_val -= dim.circleR;
            }

            return x_val; 
        })
        .attr('cy', function(d) { 
            var y;
            // if the label, when centered vertically...
            // ... is cut off at the top, shift down
            if ((dim.tsSVGHeight-(d.middle*dim.tsSVGHeight)) < dim.circleR) {
                y = 1 + dim.circleR;
            }

            // ... is cut off at the bottom, shift up
            else if ((d.middle*dim.tsSVGHeight) < dim.circleR) {
                y = dim.tsSVGHeight - 1 - dim.circleR;
            }

            // ... is not cut off, center vertically
            else {
                y = (1 - d.middle)*dim.tsSVGHeight; 
            }

            return dim.tsSVGHeight - y;
        })
        .attr('r', dim.circleR)
        .attr('fill', 'white')
        .attr('fill-opacity', 0)
        .style('pointer-events', 'none');

    labelG
        .append('text')
        .attr('font-family', 'Arial')
        .attr('font-size', dim.fontSize)
        .attr('class', function(d) { 
            if (d.type == "traditional") {
                return 'label tp_' + d.tp + ' gtype_' + d.gtype; 
            }
            return 'sepLabel tp_' + d.tp + ' gtype_' + d.gtype; 
        }) 
        .text(function(d) {
            var cp = (Math.round(d.cp * 100) / 1);
            if (cp == 0) {
                return "< 0.01";
            }
            cp_frac = (cp/100).toFixed(2);
            return cp_frac.toString();
        })
        .attr('x', function(d) { 

            // index of this time point relative to others
            var index = curVizObj.data.timepoints.indexOf(d.tp); 

            var x_val = (index / (curVizObj.data.timepoints.length-1)) * (dim.tsSVGWidth);

            // if the time point is the last
            if (index == curVizObj.data.timepoints.length - 1) {
                // shift it to the left
                x_val -= dim.circleR;
            }

            return x_val; 
        })
        .attr('y', function(d) { return dim.tsSVGHeight - (1 - d.middle)*dim.tsSVGHeight; })
        .attr('dy', function(d) {

            // if the label, when centered vertically...
            // ... is cut off at the top, shift down
            if ((dim.tsSVGHeight-(d.middle*dim.tsSVGHeight)) < dim.circleR) {
                d3.select(this).attr('y', dim.tsSVGHeight - 1 - dim.circleR);
            }

            // ... is cut off at the bottom, shift up
            else if ((d.middle*dim.tsSVGHeight) < dim.circleR) {
                d3.select(this).attr('y', 1 + dim.circleR);
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
    curVizObj.view.xAxisSVG
        .selectAll('.pertLabel')
        .data(curVizObj.data.perturbations)
        .enter().append('text')
        .attr('class', 'pertLabel')
        .attr('x', function(d) { 
            var prevTP_idx = curVizObj.data.timepoints.indexOf(d.prev_tp);
            return ((prevTP_idx + 0.5) / (curVizObj.data.timepoints.length-1)) * (dim.tsSVGWidth) + 
                dim.smallMargin + dim.yAxisWidth; 
        })
        .attr('y', 0)
        .attr('dy', '.71em')
        .attr('text-anchor', 'middle')
        .attr('font-family', 'Arial')
        .attr('font-size', '11px')
        .text(function(d) { return d.pert_name; })
        .on('mouseover', function(d) {
            if (!dim.selectOn) {
                d3.select("#" + curVizObj.view_id)
                    .selectAll(".pertGuide.pert_" + d.pert_name).attr('stroke-opacity', 1); 
            }
        })
        .on('mouseout', function(d) {
            if (!dim.selectOn) {
                d3.select("#" + curVizObj.view_id)
                    .selectAll(".pertGuide.pert_" + d.pert_name).attr('stroke-opacity', 0);
            }
        });

    // plot guides
    curVizObj.view.tsSVG
        .selectAll('.pertGuide')
        .data(curVizObj.data.perturbations)
        .enter().append('line')
        .attr('class', function(d) { return 'pertGuide pert_' + d.pert_name; })
        .attr('x1', function(d) { 
            var prevTP_idx = curVizObj.data.timepoints.indexOf(d.prev_tp);
            return ((prevTP_idx + 0.5) / (curVizObj.data.timepoints.length-1)) * (dim.tsSVGWidth); 
        })
        .attr('x2', function(d) { 
            var prevTP_idx = curVizObj.data.timepoints.indexOf(d.prev_tp);
            return ((prevTP_idx + 0.5) / (curVizObj.data.timepoints.length-1)) * (dim.tsSVGWidth); 
        })
        .attr('y1', 0)
        .attr('y2', dim.tsSVGHeight)
        .attr('stroke', 'grey')
        .attr('stroke-opacity', '0')
        .attr('stroke-width', '1.5px')
        .style('pointer-events', 'none');


    // PLOT AXES

    // plot x-axis labels
    curVizObj.view.xAxisSVG
        .selectAll('.xAxisLabels')
        .data(curVizObj.data.timepoints)
        .enter().append('text')
        .attr('class', function(d) { return 'xAxisLabels tp_' + d; })
        .attr('x', function(d, i) { 
            return (i / (curVizObj.data.timepoints.length-1)) * (dim.tsSVGWidth) + dim.smallMargin + dim.yAxisWidth; 
        })
        .attr('y', 0)
        .attr('dy', '.71em')
        .attr('text-anchor', 'middle')
        .attr('font-family', 'Arial')
        .attr('font-size', '11px')
        .text(function(d) { return d; })
        .on('mouseover', function(d) {
            if (!dim.selectOn) {
                d3.select("#" + curVizObj.view_id).selectAll(".tpGuide.tp_" + d).attr('stroke-opacity', 1); 
            }
        })
        .on('mouseout', function(d) {
            if (!dim.selectOn) {
                d3.select("#" + curVizObj.view_id).selectAll(".tpGuide.tp_" + d).attr('stroke-opacity', 0);
            }
        });

    // plot y-axis title
    curVizObj.view.yAxisSVG
        .append('text')
        .attr('class', 'axisTitle yAxis')
        .attr('x', 0)
        .attr('y', 0)
        .attr('dy', '.35em')
        .attr('text-anchor', 'middle')
        .attr('font-family', 'Arial')
        .attr('font-size', '15px')
        .attr('font-weight', 'bold')
        .attr('transform', "translate(" + (dim.yAxisWidth/2) + ", " + (dim.tsSVGHeight/2) + ") rotate(-90)")
        .text(function() { 
            return x.yaxis_title;
        });

    // plot x-axis title
    curVizObj.view.xAxisSVG
        .append('text')
        .attr('class', 'axisTitle xAxis')
        .attr('x', dim.yAxisWidth + dim.smallMargin + dim.xAxisWidth/2)
        .attr('y', 25)
        .attr('text-anchor', 'middle')
        .attr('font-family', 'Arial')
        .attr('font-size', '15px')
        .attr('font-weight', 'bold')
        .text(function() { 
            return x.xaxis_title;
        });


    // PLOT TREE GLYPH

    console.log("curVizObj");
    console.log(curVizObj);

    // plot tree title
    curVizObj.view.tsTree
        .append('text')
        .attr('class', 'treeTitle')
        .attr('x', 0)
        .attr('y', 0)
        .attr('dy', '.71em')
        .attr('text-anchor', 'left')
        .attr('font-family', 'Arial')
        .attr('font-size', '15px')
        .attr('font-weight', 'bold')
        .text('Phylogeny'); 

    // d3 tree layout
    var treePadding = 10,
        treeTitleHeight = d3.select("#" + curVizObj.view_id)
                            .select('.treeTitle').node().getBBox().height,
        treeLayout = d3.layout.tree()           
            .size([dim.treeHeight - treePadding - treeTitleHeight, dim.treeWidth - treePadding]); 

    // get nodes and links
    var root = $.extend({}, curVizObj.data.treeStructure), // copy tree into new variable
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
    curVizObj.link_ids = [];
    var link = curVizObj.view.tsTree.append("g")
        .classed("treeLinks", true)
        .selectAll(".legendTreeLink")                  
        .data(links)                   
        .enter().append("path")                   
        .attr("class", function(d) { 
            d.link_id = "treeLink_" + d.source.id + "_" + d.target.id;
            curVizObj.link_ids.push(d.link_id);
            return "legendTreeLink " + d.link_id;
        })
        .attr('stroke', dim.treeLinkColour)
        .attr('fill', 'none')                
        .attr("d", _elbow); 

    // create nodes
    var node = curVizObj.view.tsTree.selectAll(".legendTreeNode")                  
        .data(nodes)                   
        .enter()
        .append("circle")     
        .attr("cx", function(d) { return d.x})
        .attr("cy", function(d) { return d.y})              
        .attr("class", function(d) { return "legendTreeNode gtype_" + d.id; })
        .attr("fill", function(d) {
            return (d.id == dim.phantomRoot) ? "none" : alpha_colour_assignment[d.id];
        })
        .attr('stroke', function(d) {
            return (d.id == dim.phantomRoot) ? "none" : colour_assignment[d.id];
        })
        .attr("id", function(d) { return d.sc_id; })
        .attr("r", 4)
        .on('mouseover', function(d) {
            // if we're selecting nodes
            if (dim.nClickedNodes > 0 && d.id != dim.phantomRoot) {
                // highlight node in the legend
                d3.select(this)
                    .attr('fill', function(d) { 
                        return alpha_colour_assignment[d.id];
                    })
                    .attr('stroke', function(d) { 
                        return colour_assignment[d.id];
                    });
            }
            // we're not selecting nodes or mutations - highlight genotype
            if (!dim.selectOn && !dim.mutSelectOn) {
                _shadeTimeSweep(curVizObj);
                _shadeLegend(curVizObj);
                _gtypeHighlight(d.id, curVizObj);
                _showLabels(d.id, curVizObj);
            }
        })
        .on('mouseout', function(d) {
            // if we're selecting nodes, but we haven't clicked this one yet
            if ((dim.nClickedNodes > 0) && (_.uniq(dim.curCloneIDs).indexOf(d.id) == -1)) {
                // unhighlight this node in the legend
                d3.select(this)
                    .attr('fill', function(d) { 
                        col = alpha_colour_assignment[d.id];
                        brightness = Math.round(_get_brightness(col));
                        return (d.id == dim.phantomRoot) ? 
                            "none" : _rgb2hex("rgb(" + brightness + "," + brightness + "," + brightness + ")");
                    })
                    .attr('stroke', function(d) { 
                        brightness = Math.round(_get_brightness(colour_assignment[d.id]));
                        return (d.id == dim.phantomRoot) ? 
                            "none" : _rgb2hex("rgb(" + brightness + "," + brightness + "," + brightness + ")");
                    });
            }
            // we're not selecting nodes or mutations - mouseout as normal
            if (!dim.selectOn && !dim.mutSelectOn) {
                return _resetView(curVizObj);
            }
        })
        .on("click", function(d) {
            // if there are mutations and we're not selecting any of them
            if (curVizObj.userConfig.mutations[0] != "NA" && !dim.mutSelectOn) {

                dim.selectOn = true;
                dim.nClickedNodes++; // increment the number of clicked nodes

                // reset view (get rid of any labels, etc.)
                _removeLabels(curVizObj);

                // get data for this clone
                var filtered_muts = 
                    _.filter(curVizObj.data.mutations, function(mut) { return mut.clone_id == d.id; });

                // if there's no data for this clone, add a row of "None"
                if (filtered_muts.length == 0) { 
                    filtered_muts = [{}];
                    dim.mutationColumns.forEach(function(col) {
                        filtered_muts[0][col.data] = (col.data == "empty") ? "" : "None";
                    })
                }
                filtered_muts[0]["clone_id"] = d.id;

                // if it's the first clicked node
                if (dim.nClickedNodes == 1) {
                    // delete existing data table
                    d3.select("#" + curVizObj.view_id + "_mutationTable" + "_wrapper").remove();   

                    // plot filtered data table
                    _makeMutationTable(curVizObj, curVizObj.view.mutationTableDIV, filtered_muts,
                        dim.mutationTableHeight); 

                    // shade view & legend 
                    _shadeTimeSweep(curVizObj);
                    _shadeLegend(curVizObj);
                }
                // otherwise
                else {
                    // add to existing data table
                    var table = $("#" + curVizObj.view_id + "_mutationTable").DataTable();
                    table.rows.add(filtered_muts).draw(false);

                    // add this clone id to the list of clone ids in the mutation table
                    dim.curCloneIDs = dim.curCloneIDs.concat(_.pluck(filtered_muts, "clone_id"));

                    // plot clone svg circles in mutation table
                    _addCloneSVGsToTable(curVizObj, dim.curCloneIDs);
                }

                // highlight this clone
                _gtypeHighlight(d.id, curVizObj);

                d3.event.stopPropagation();
            }
        });

    // SWITCH between traditional and tracks views

    // checkbox
    var input = curVizObj.view.tsSwitch
        .append("foreignObject")
        .attr('x', -10)
        .attr('y', 5)
        .attr('width', 50)
        .attr('height', 20)
        .append("xhtml:body")
        .html("<input type=\"checkbox\">");

    // checkbox text
    var bottomPadding = 5,
        betweenTextPadding = 2,
        clonalTrajectoryFontSize = 15;
    curVizObj.view.tsSwitch
        .append("text")
        .attr('x', 17)
        .attr('y', dim.clonalTrajectoryLabelHeight - bottomPadding - 
            betweenTextPadding - clonalTrajectoryFontSize)
        .attr('text-anchor', 'left')
        .attr('font-family', 'Arial')
        .attr('font-size', clonalTrajectoryFontSize + 'px')
        .attr('font-weight', 'bold')
        .text("Clonal")
    curVizObj.view.tsSwitch
        .append("text")
        .attr('x', 17)
        .attr('y', dim.clonalTrajectoryLabelHeight - bottomPadding)
        .attr('text-anchor', 'left')
        .attr('font-family', 'Arial')
        .attr('font-size', clonalTrajectoryFontSize + 'px')
        .attr('font-weight', 'bold')
        .text("Trajectory")

    // when checkbox selected, change view
    input.on("change", function() {
        _sweepClick(curVizObj);
    });

    // MUTATION TABLE

    // if mutations are specified by the user
    if (curVizObj.userConfig.mutations != "NA") {

        // make the table
        _makeMutationTable(curVizObj, curVizObj.view.mutationTableDIV, curVizObj.data.mutations,
            dim.mutationTableHeight);
    }
  },

  resize: function(el, width, height, instance) {
    return {}
    
  }

});
