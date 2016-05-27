// FUNCTIONS

// d3 EFFECTS FUNCTIONS

/* recursive function to perform downstream or upstream effects on legend tree link
* @param {Object} curVizObj -- vizObj for the current view
* @param {String} link_id -- id for the link that's currently highlighted
* @param {Array} link_ids -- ids for all links in tree
* @param {String} stream_direction -- "downstream" or "upstream"
*/
function _ts_propagatedEffects(curVizObj, link_id, link_ids, stream_direction) {
    var view_id = curVizObj.tsView_id,
        dim = curVizObj.tsGeneralConfig,
        colour_assignment = curVizObj.tsView.colour_assignment,
        alpha_colour_assignment = curVizObj.tsView.alpha_colour_assignment;

    // clear propagation info in vizObj
    curVizObj.tsView.propagation = {};

    // get propagation info
    _ts_getPropatagedItems(curVizObj, link_id, link_ids, stream_direction);

    // highlight links in legend
    curVizObj.tsView.propagation.link_ids.forEach(function(cur_link_id) {
        d3.select("#" + curVizObj.tsView_id)
            .select(".legendTreeLink." + cur_link_id)
            .attr("stroke-opacity", 1);
    });

    // highlight nodes in the legend
    curVizObj.tsView.propagation.node_ids.forEach(function(node) {
        d3.select("#" + view_id)
            .select(".legendTreeNode.gtype_" + node)
            .attr("fill", function(d) {
            return (d.id == dim.phantomRoot) ? "none" : alpha_colour_assignment[d.id];
            })
            .attr('stroke', function(d) {
                return (d.id == dim.phantomRoot) ? "none" : colour_assignment[d.id];
            });
    });

    // highlight genotypes in timesweep
    curVizObj.tsView.propagation.node_ids.forEach(function(node) {
        d3.select("#" + view_id)
            .select(".tsPlot.gtype_" + node)
            .attr('fill', function(d) { 
            return alpha_colour_assignment[d.gtype];
            }) 
            .attr('stroke', function(d) { 
                return colour_assignment[d.gtype]; 
            });
    });
};


/* function to get the links, nodes, samples and sample locations participating in the current propagation
* @param {Object} curVizObj -- vizObj for the current view
* @param {String} link_id -- id for the link that's currently highlighted
* @param {Array} link_ids -- ids for all links in tree
* @param {String} stream_direction -- "downstream" or "upstream"
*/
function _ts_getPropatagedItems(curVizObj, link_id, link_ids, stream_direction) {
    var view_id = curVizObj.tsView_id,
        generalTargetRX = new RegExp("treeLink_source_.+_target_(.+)"), // regex to get target
        generalSourceRX = new RegExp("treeLink_source_(.+)_target_.+"); // regex to get source

    // get target & source id of this link
    var target_id = generalTargetRX.exec(link_id)[1];
    var source_id = generalSourceRX.exec(link_id)[1];

    // get the targets of this target, or sources of source
    var nextNodeRX = (stream_direction == "downstream") ? 
        new RegExp("treeLink_source_" + target_id + "_target_(.+)") :
        new RegExp("treeLink_source_(.+)_target_" + source_id);
    var targetLinks_of_targetNode = [];
    link_ids.map(function(id) {
        if (id.match(nextNodeRX)) {
            targetLinks_of_targetNode.push(id);
        }
    });

    // add information to curVizObj
    curVizObj.tsView.propagation = curVizObj.tsView.propagation || {};
    curVizObj.tsView.propagation.node_ids = curVizObj.tsView.propagation.node_ids || [];
    curVizObj.tsView.propagation.node_ids.push(target_id);
    curVizObj.tsView.propagation.link_ids = curVizObj.tsView.propagation.link_ids || [];
    curVizObj.tsView.propagation.link_ids.push(link_id);

    // for each of the target's targets, highlight their downstream links
    targetLinks_of_targetNode.map(function(target_link_id) {
        _ts_getPropatagedItems(curVizObj, target_link_id, link_ids, stream_direction);
    });
};


function _ts_sweepClick(curVizObj) {
    var dim = curVizObj.tsGeneralConfig,
        colour_assignment = curVizObj.tsView.colour_assignment,
        alpha_colour_assignment = curVizObj.tsView.alpha_colour_assignment,
        x = curVizObj.userConfig;

    // hide any cellular prevalence labels
    d3.select("#" + curVizObj.tsView_id).selectAll(".label, .sepLabel")
        .attr('opacity', 0);
    d3.select("#" + curVizObj.tsView_id).selectAll(".labelCirc, .sepLabelCirc")
        .attr('fill-opacity', 0);

    // transition to tracks timesweep view
    if (dim.switchView) {
        var sweeps = curVizObj.tsView.tsSVG
            .selectAll('.tsPlot')
            .data(curVizObj.tsData.tracks_bezier_paths, function(d) {
                return d.gtype;
            })

        sweeps
            .transition()
            .duration(1000)
            .attrTween("d", _ts_pathTween(curVizObj, "move"));

        // remove genotypes that do not have cellular prevalence values
        sweeps
            .exit()
            .transition()
            .duration(1000)
            .attrTween("d", _ts_pathTween(curVizObj, "exit"))
            .remove();
    }
    // transition to traditional timesweep view
    else {
        var sweeps = curVizObj.tsView.tsSVG
            .selectAll('.tsPlot')
            .data(curVizObj.tsData.bezier_paths, function(d) {
                return d.gtype;
            })

        sweeps
            .transition()
            .duration(1000)
            .attrTween("d", _ts_pathTween(curVizObj, "move"));

        // add those genotypes that do not have cellular prevalence values, but are in the hierarchy
        sweeps
            .enter()
            .insert('path', '.tsPlot')
            .attr('class', function(d) { return 'tsPlot gtype_' + d.gtype; })
            .attr("d", _ts_centreLine(curVizObj))
            .attr('fill', function(d) { 
                // if we're selecting nodes, but we haven't clicked this one yet
                if ((dim.nClickedNodes > 0) && (_.uniq(dim.curCloneIDs).indexOf(d.id) == -1)) {
                        // greyscale
                        return _ts_getGreyscaleEquivalent(alpha_colour_assignment[d.gtype]);
                }
                // otherwise
                return alpha_colour_assignment[d.gtype];
            }) 
            .attr('stroke', function(d) { 
                // if we're selecting nodes, but we haven't clicked this one yet
                if ((dim.nClickedNodes > 0) && (_.uniq(dim.curCloneIDs).indexOf(d.id) == -1)) {
                        // greyscale
                        return _ts_getGreyscaleEquivalent(colour_assignment[d.gtype]);
                }
                // otherwise
                return colour_assignment[d.gtype]; 
            })
            .on('mouseover', function(d) {
                if (!dim.selectOn && !dim.mutSelectOn) {
                    _ts_shadeTimeSweep(curVizObj);
                    _ts_shadeLegend(curVizObj);
                    _ts_gtypeHighlight(d.gtype, curVizObj);
                    _ts_showLabels(d.gtype, curVizObj);
                }
            })
            .on('mouseout', function(d) {
                if (!dim.selectOn && !dim.mutSelectOn) {
                    _ts_resetView(curVizObj);
                }
            })
            .transition()
            .duration(1000)
            .attrTween("d", _ts_pathTween(curVizObj, "move"));
    }
    dim.switchView = !dim.switchView;
}

/* function to highlight a particular genotype in the timesweep and legend
* @param {String} gtype -- the current genotype being moused over
* @param {Object} curVizObj -- vizObj for the current view
*/
function _ts_gtypeHighlight(gtype, curVizObj) {
    var alpha_colour_assignment = curVizObj.tsView.alpha_colour_assignment,
        colour_assignment = curVizObj.tsView.colour_assignment;

    // highlight genotype in timesweep
    d3.select("#" + curVizObj.tsView_id).select('.tsPlot.gtype_' + gtype)
        .attr('fill', function(d) { 
            return alpha_colour_assignment[d.gtype];
        })
        .attr('stroke', function(d) { 
            return colour_assignment[d.gtype];
        });

    // highlight genotype in legend
    d3.select("#" + curVizObj.tsView_id).select('.legendTreeNode.gtype_' + gtype)
        .attr('fill', function(d) { 
            return alpha_colour_assignment[d.id];
        })
        .attr('stroke', function(d) { 
            return colour_assignment[d.id];
        });
}

/* function to shade the timesweep view
*/
function _ts_shadeTimeSweep(curVizObj) {
    var brightness,
        col,
        colour_assignment = curVizObj.tsView.colour_assignment,
        alpha_colour_assignment = curVizObj.tsView.alpha_colour_assignment;

    // dim genotypes in the timesweep
    d3.select("#" + curVizObj.tsView_id).selectAll('.tsPlot')
        .attr('fill', function(d) { 
            return _ts_getGreyscaleEquivalent(alpha_colour_assignment[d.gtype]);
        })
        .attr('stroke', function(d) { 
            return _ts_getGreyscaleEquivalent(colour_assignment[d.gtype]);
        });
}

/* function to shade the legend
*/
function _ts_shadeLegend(curVizObj) {
    var brightness,
        col,
        dim = curVizObj.tsGeneralConfig,
        colour_assignment = curVizObj.tsView.colour_assignment,
        alpha_colour_assignment = curVizObj.tsView.alpha_colour_assignment;

    // dim links in legend
    d3.select("#" + curVizObj.tsView_id).selectAll('.legendTreeLink')
        .attr("stroke-opacity", 0.2);

    // dim nodes in the legend
    d3.select("#" + curVizObj.tsView_id).selectAll('.legendTreeNode')
        .attr('fill', function(d) { 
            return (d.id == dim.phantomRoot) ? 
                "none" : _ts_getGreyscaleEquivalent(alpha_colour_assignment[d.id]);
        })
        .attr('stroke', function(d) { 
            return (d.id == dim.phantomRoot) ? 
                "none" : _ts_getGreyscaleEquivalent(colour_assignment[d.id]);
        });
}

/* function to reset the main timesweep view and legend
* @param {Object} curVizObj -- vizObj for the current view
*/
function _ts_resetView(curVizObj) {
    var dim = curVizObj.tsGeneralConfig,
        colour_assignment = curVizObj.tsView.colour_assignment,
        alpha_colour_assignment = curVizObj.tsView.alpha_colour_assignment,
        x = curVizObj.userConfig;

    // reset colours in timesweep
    d3.select("#" + curVizObj.tsView_id).selectAll('.tsPlot')
        .attr('fill', function(d) { 
            return alpha_colour_assignment[d.gtype];
        })
        .attr('stroke', function(d) { 
            return colour_assignment[d.gtype];
        });

    // reset node colours in legend
    d3.select("#" + curVizObj.tsView_id).selectAll('.legendTreeNode')
        .attr('fill', function(d) { 
            return (d.id == dim.phantomRoot) ? "none" : alpha_colour_assignment[d.id];
        })
        .attr('stroke', function(d) { 
            return (d.id == dim.phantomRoot) ? "none" : colour_assignment[d.id];
        });

    // reset links in legend
    d3.select("#" + curVizObj.tsView_id).selectAll('.legendTreeLink')
        .attr("stroke-opacity", 1);

    // remove labels
    _ts_removeLabels(curVizObj);

}

/* Create clonal prevalence labels
* @param {Object} curVizObj -- vizObj for the current view
* @param {Array} label_data -- array of objects containing label data, one label per object
*/
function _ts_createLabels(curVizObj, label_data) {
    var dim = curVizObj.tsGeneralConfig;

    // for each cellular prevalence label for this genotype
    label_data.forEach(function(data) {
        curVizObj.tsView.tsSVG
            .append('circle')
            .attr('class', function() { 
                if (data.type == "traditional") {
                    return 'labelCirc tp_' + data.tp + ' gtype_' + data.gtype; 
                }
                return 'sepLabelCirc tp_' + data.tp + ' gtype_' + data.gtype; 
            }) 
            .attr('cx', function() { 

                // index of this time point relative to others
                var index = curVizObj.tsData.timepoints.indexOf(data.tp); 

                var x_val = (index / (curVizObj.tsData.timepoints.length-1)) * (dim.tsSVGWidth);

                // if the time point is the last
                if (index == curVizObj.tsData.timepoints.length - 1) {
                    // shift it to the left
                    x_val -= dim.circleR;
                }

                return x_val; 
            })
            .attr('cy', function() { 
                var y;
                // if the label, when centered vertically...
                // ... is cut off at the top, shift down
                if ((dim.tsSVGHeight-(data.middle*dim.tsSVGHeight)) < dim.circleR) {
                    y = 1 + dim.circleR;
                }

                // ... is cut off at the bottom, shift up
                else if ((data.middle*dim.tsSVGHeight) < dim.circleR) {
                    y = dim.tsSVGHeight - 1 - dim.circleR;
                }

                // ... is not cut off, center vertically
                else {
                    y = (1 - data.middle)*dim.tsSVGHeight; 
                }

                return dim.tsSVGHeight - y;
            })
            .attr('r', dim.circleR)
            .attr('fill', 'white')
            .style('pointer-events', 'none');

        curVizObj.tsView.tsSVG
            .append('text')
            .attr('font-family', 'Arial')
            .attr('font-size', dim.fontSize)
            .attr('class', function() { 
                if (data.type == "traditional") {
                    return 'label tp_' + data.tp + ' gtype_' + data.gtype; 
                }
                return 'sepLabel tp_' + data.tp + ' gtype_' + data.gtype; 
            }) 
            .text(function() {
                var cp = (Math.round(data.cp * 100) / 1);
                if (cp == 0) {
                    return "< 0.01";
                }
                cp_frac = (cp/100).toFixed(2);
                return cp_frac.toString();
            })
            .attr('x', function() { 

                // index of this time point relative to others
                var index = curVizObj.tsData.timepoints.indexOf(data.tp); 

                var x_val = (index / (curVizObj.tsData.timepoints.length-1)) * (dim.tsSVGWidth);

                // if the time point is the last
                if (index == curVizObj.tsData.timepoints.length - 1) {
                    // shift it to the left
                    x_val -= dim.circleR;
                }

                return x_val; 
            })
            .attr('y', function() { return dim.tsSVGHeight - (1 - data.middle)*dim.tsSVGHeight; })
            .attr('dy', function() {

                // if the label, when centered vertically...
                // ... is cut off at the top, shift down
                if ((dim.tsSVGHeight-(data.middle*dim.tsSVGHeight)) < dim.circleR) {
                    d3.select(this).attr('y', dim.tsSVGHeight - 1 - dim.circleR);
                }

                // ... is cut off at the bottom, shift up
                else if ((data.middle*dim.tsSVGHeight) < dim.circleR) {
                    d3.select(this).attr('y', 1 + dim.circleR);
                }

                // ... is not cut off, center vertically
                return '.35em';
            })
            .attr('fill', 'black')
            .attr('text-anchor', 'middle')
            .style('pointer-events', 'none');
    });
}

/* function to show labels for a particular genotype
* @param {String} gtype -- the current genotype being moused over
* @param {Object} curVizObj -- vizObj for the current view
*/
function _ts_showLabels(gtype, curVizObj) {
    var dim = curVizObj.tsGeneralConfig;

    // traditional view
    if (dim.switchView) { 
        // get clonal prevalence labels for this genotype
        var labels = curVizObj.tsData.ts_trad_labels;
        var gtype_labels = _.filter(labels, function(lab) { return (lab.gtype == gtype); });

        // create the labels for this genotype
        _ts_createLabels(curVizObj, gtype_labels);
    }

    // tracks view
    else { 
        // get clonal prevalence labels for this genotype
        var labels = curVizObj.tsData.ts_sep_labels;
        var gtype_labels = _.filter(labels, function(lab) { return (lab.gtype == gtype); });

        // create the labels for this genotype
        _ts_createLabels(curVizObj, gtype_labels);
    }
}

/* function to remove labels and label circles
* @param {Object} curVizObj -- vizObj for the current view
*/
function _ts_removeLabels(curVizObj) {
    var dim = curVizObj.tsGeneralConfig;

    // traditional view
    if (dim.switchView) {
        // hide labels
        d3.select("#" + curVizObj.tsView_id).selectAll(".label").remove();

        // hide label backgrounds
        d3.select("#" + curVizObj.tsView_id).selectAll(".labelCirc").remove();
    }

    // tracks view
    else {
        // hide labels
        d3.select("#" + curVizObj.tsView_id).selectAll(".sepLabel").remove();

        // hide label backgrounds
        d3.select("#" + curVizObj.tsView_id).selectAll(".sepLabelCirc").remove();
    }
}

/* background click function (turns off selections, resets view)
* @param {Object} curVizObj -- vizObj for the current view
*/
function _ts_backgroundClick(curVizObj) {
    var dim = curVizObj.tsGeneralConfig;

    // if there was just a link selection, refresh the mutations table
    if (dim.selectOn) {
        // delete existing data table
        d3.select("#" + curVizObj.tsView_id + "_mutationTable" + "_wrapper").remove();

        // make new full table
        _ts_makeMutationTable(curVizObj, curVizObj.tsView.mutationTableDIV, curVizObj.tsData.mutations,
            dim.mutationTableHeight);
    }

    dim.selectOn = false;
    dim.mutSelectOn = false;
    dim.nClickedNodes = 0;
    dim.curCloneIDs = [];

    // mark all mutations as unselected
    d3.select("#" + curVizObj.tsView_id + "_mutationTable").selectAll("tr").classed('selected', false);

    // unhighlight phylogeny links (highlighting occurs when mutation selected)
    d3.select("#" + curVizObj.tsView_id).selectAll(".legendTreeLink").attr("stroke", dim.treeLinkColour);

    // hide VAF tooltips
    curVizObj.vafTips.forEach(function(curTip) {
        curTip.hide();
    })

    _ts_resetView(curVizObj);
}

// TREE FUNCTIONS

/* extract all info from tree about nodes, edges, ancestors, descendants
* @param {Object} curVizObj 
*/
function _ts_getTreeInfo(curVizObj) {
    var userConfig = curVizObj.userConfig,
        cur_edges = userConfig.tree_edges,
        phantomRoot = curVizObj.tsGeneralConfig.phantomRoot; // root so we have a lead-in link to the real root

    // get tree nodes
    curVizObj.tsData.treeNodes = _.uniq(_.pluck(cur_edges, "source").concat(_.pluck(cur_edges, "target")));
    curVizObj.tsData.treeNodes.push(phantomRoot);

    // get tree edges
    curVizObj.tsData.treeEdges = [];
    for (var i = 0; i < cur_edges.length; i++) {
        curVizObj.tsData.treeEdges.push({
            "source": cur_edges[i].source,
            "target": cur_edges[i].target
        })
    }

    // find tree root
    var cur_source = curVizObj.tsData.treeEdges[0].source;
    var source_as_target = // edge where the current source is the target
        _.findWhere(curVizObj.tsData.treeEdges, {"target": cur_source}); 
    while (source_as_target) { // iterate as long as there are edges with the current source as the target
        cur_source = source_as_target.source;
        source_as_target = _.findWhere(curVizObj.tsData.treeEdges, {"target": cur_source});
    }
    var rootName = cur_source;

    // add the phantomRoot to the tree edges array
    curVizObj.tsData.treeEdges.push({
        "source": phantomRoot,
        "target": rootName
    })

    // get tree structure
    var nodesByName = [];
    for (var i = 0; i < curVizObj.tsData.treeEdges.length; i++) {
        var parent = _ts_findNodeByName(nodesByName, curVizObj.tsData.treeEdges[i].source);
        var child = _ts_findNodeByName(nodesByName, curVizObj.tsData.treeEdges[i].target);
        parent["children"].push(child);
    }
    var root_tree = _ts_findNodeByName(nodesByName, phantomRoot); 
    curVizObj.tsData.treeStructure = root_tree; 

    // get linear chains
    curVizObj.tsData.treeChainRoots = []; // keep track of linear chain segment roots
    curVizObj.tsData.treeChains = 
        _ts_getLinearTreeSegments(curVizObj, curVizObj.tsData.treeStructure, {}, "");

    // get descendants for each node
    curVizObj.tsData.treeDescendantsArr = {};
    curVizObj.tsData.treeNodes.forEach(function(node, idx) {
        var curRoot = _ts_findNodeByName(nodesByName, node);
        var curDescendants = _ts_getDescendantIds(curRoot, []);
        curVizObj.tsData.treeDescendantsArr[node] = curDescendants;
    })
    curVizObj.tsData.direct_descendants = _ts_getDirectDescendants(curVizObj.tsData.treeStructure, {});

    // get ancestors for each node
    curVizObj.tsData.treeAncestorsArr = _ts_getAncestorIds(curVizObj);
    curVizObj.tsData.direct_ancestors = _ts_getDirectAncestors(curVizObj.tsData.treeStructure, {});

    // get siblings for each node
    curVizObj.tsData.siblings = _ts_getSiblings(curVizObj.tsData.treeStructure, {}); 

    // get the height of the tree
    curVizObj.tsData.tree_height = 0;
    Object.keys(curVizObj.tsData.treeAncestorsArr).forEach(function(key) {
        var ancestor_arr = curVizObj.tsData.treeAncestorsArr[key];
        if (ancestor_arr.length > curVizObj.tsData.tree_height) {
            curVizObj.tsData.tree_height = ancestor_arr.length;
        }
    })
}

/* function to find a key by its name - if the key doesn't exist, it will be created and added to the list of nodes
* @param {Array} list - list of nodes
* @param {String} name - name of key to find
*/
function _ts_findNodeByName(list, name) {
    var foundNode = _.findWhere(list, {id: name}),
        curNode;

    if (!foundNode) {
        curNode = {'id': name, 'children': []};
        list.push(curNode);
        return curNode;
    }

    return foundNode;
}

/* function to get descendants id's for the specified key
* @param {Object} root - key for which we want descendants
* @param {Array} descendants - initially empty array for descendants to be placed into
*/
function _ts_getDescendantIds(root, descendants) {
    var child;

    if (root["children"].length > 0) {
        for (var i = 0; i < root["children"].length; i++) {
            child = root["children"][i];
            descendants.push(child["id"]);
            _ts_getDescendantIds(child, descendants);
        }
    }
    return descendants;
}

/* function to get the ancestor ids for all nodes
* @param {Object} curVizObj
*/
function _ts_getAncestorIds(curVizObj) {
    var ancestors = {},
        curDescendants,
        descendants_arr = curVizObj.tsData.treeDescendantsArr,
        treeNodes = curVizObj.tsData.treeNodes;

    // set up each node as originally containing an empty list of ancestors
    treeNodes.forEach(function(node, idx) {
        ancestors[node] = [];
    })

    // get ancestors data from the descendants data
    treeNodes.forEach(function(node, idx) {
        // for each descendant of this node
        curDescendants = descendants_arr[node];
        for (var i = 0; i < curDescendants.length; i++) { 
            // add the node to descentant's ancestor list
            ancestors[curDescendants[i]].push(node);
        }
    })

    return ancestors;
}

/* function to get the DIRECT descendant id for all nodes
* @param {Object} curNode -- current node in the tree (originally the root)
* @param {Object} dir_descendants -- originally empty array of direct descendants for each node
*/
function _ts_getDirectDescendants(curNode, dir_descendants) {
    dir_descendants[curNode.id] = [];

    if (curNode.children.length > 0) {
        for (var i = 0; i < curNode.children.length; i++) {
            dir_descendants[curNode.id].push(curNode.children[i].id);
            _ts_getDirectDescendants(curNode.children[i], dir_descendants)
        }
    }

    return dir_descendants;
}

/* function to get the DIRECT ancestor id for all nodes
* @param {Object} curNode -- current node in the tree (originally the root)
* @param {Object} dir_ancestors -- originally empty array of direct descendants for each node
*/
function _ts_getDirectAncestors(curNode, dir_ancestors) {

    if (curNode.children.length > 0) {
        for (var i = 0; i < curNode.children.length; i++) {
            dir_ancestors[curNode.children[i].id] = curNode.id;
            _ts_getDirectAncestors(curNode.children[i], dir_ancestors)
        }
    }

    return dir_ancestors;
}

/* function to get the sibling ID's for each node
* @param {Object} curNode -- current node in the tree (originally the root)
* @param {Object} sibs -- originally empty array of siblings for each node
*/
function _ts_getSiblings(curNode, sibs) {
    var cur_sibs = [];

    // get current siblings
    if (curNode.children.length > 0) {
        for (var i = 0; i < curNode.children.length; i++) {
            cur_sibs.push(curNode.children[i].id);
            _ts_getSiblings(curNode.children[i], sibs)
        }
    }
    
    // note siblings for each sibling
    for (var i = 0; i < cur_sibs.length; i++) {
        for (var j = 0; j < cur_sibs.length; j++) {
            if (cur_sibs[j] != cur_sibs[i]) {
                sibs[cur_sibs[i]] = sibs[cur_sibs[i]] || [];
                sibs[cur_sibs[i]].push(cur_sibs[j]);
            }
        }
    }

    return sibs;
}

/* function to find the ancestors of the specified genotype that emerge at a particular time point
* @param {Object} layout -- for each time point, the interval boundaries for each genotype at that time point
* @param {Object} treeAncestorsArr -- for each genotype (properties), an array of their ancestors (values)
* @param {String} gtype -- the genotype of interest
* @param {String} tp -- the time point of interest
*/
function _ts_findEmergentAncestors(layout, treeAncestorsArr, gtype, tp) {
    var ancestors = [],
        pot_ancestor; // potential ancestor

    // for each ancestral genotype, 
    for (var i = 0; i < treeAncestorsArr[gtype].length; i++) {
        pot_ancestor = treeAncestorsArr[gtype][i];

        // if this ancestor emerged here as well, increase the # ancestors for this genotype
        if (layout[tp][pot_ancestor] && layout[tp][pot_ancestor]["state"] == "emerges") {
            ancestors.push(pot_ancestor);
        }
    }

    return ancestors;
}

/* elbow function to draw phylogeny links 
*/
function _ts_elbow(d) {
    return "M" + d.source.x + "," + d.source.y
        + "H" + (d.source.x + (d.target.x-d.source.x)/2)
        + "V" + d.target.y + "H" + d.target.x;
}

/*
* function to, using the tree hierarchy, get the linear segments' starting key and length (including starting key)
* @param {Object} curNode -- current key in the tree
* @param {Object} chains -- originally empty object of the segments 
*                           (key is segment start key, value is array of descendants in this chain)
* @param {Object} base -- the base key of this chain (originally "")
*/
function _ts_getLinearTreeSegments(curVizObj, curNode, chains, base) {

    // if it's a new base, create the base, with no descendants in its array yet
    if (base == "") {
        base = curNode.id;
        chains[base] = [];
        curVizObj.tsData.treeChainRoots.push(curNode.id);
    }
    // if it's a linear descendant, append the current key to the chain
    else {
        chains[base].push(curNode.id);
    }

    // if the current key has 1 child to search through
    if (curNode.children.length == 1) { 
        _ts_getLinearTreeSegments(curVizObj, curNode.children[0], chains, base);
    }

    // otherwise for each child, create a blank base (will become that child)
    else {
        for (var i = 0; i < curNode.children.length; i++) {
            _ts_getLinearTreeSegments(curVizObj, curNode.children[i], chains, "");
        }
    }

    return chains;
}

// CELLULAR PREVALENCE FUNCTIONS

/* function to get the cellular prevalence data in a better format 
* (properties at level 1 is time, at level 2 is gtype)
*/
function _ts_getCPData(curVizObj) {
    var x = curVizObj.userConfig;

    // for each time point, for each genotype, get cellular prevalence
    var cp_data_original = {};
    $.each(x.clonal_prev, function(idx, hit) { // for each hit (genotype/timepoint combination)
        cp_data_original[hit["timepoint"]] = cp_data_original[hit["timepoint"]] || {};
        // only note cellular prevalences not marked as zero
        if (parseFloat(hit["clonal_prev"]) != 0) {
            cp_data_original[hit["timepoint"]][hit["clone_id"]] = parseFloat(hit["clonal_prev"]); 
        }
    });

    // create timepoint zero with 100% cellular prevalence for the root of the tree
    cp_data_original["T0"] = {};
    curVizObj.tsData.cp_data_original = cp_data_original;

    // get normalized cp data (in cases where cp doesn't add to 1)
    var cp_data_norm = {};
    Object.keys(cp_data_original).forEach(function(tp_key) {
        // get total cp for this timepoint
        var tp_total = 0;
        Object.keys(cp_data_original[tp_key]).forEach(function(gtype_key) {
            tp_total += cp_data_original[tp_key][gtype_key];
        });

        // get proportionate cp for each genotype
        cp_data_norm[tp_key] = {};
        Object.keys(cp_data_original[tp_key]).forEach(function(gtype_key) {
            cp_data_norm[tp_key][gtype_key] = cp_data_original[tp_key][gtype_key]/tp_total;
        });
    })

    curVizObj.tsData.cp_data = cp_data_norm;
}

/* function to get the cellular prevalence value for each genotype at its emergence
* @param {Object} curVizObj
*/
function _ts_getEmergenceValues(curVizObj) {
    var cp_data = curVizObj.tsData.cp_data,
        emergence_values = {},
        gtypes;

    // for each time point
    curVizObj.tsData.timepoints.forEach(function(tp) { 

        // get genotypes
        gtypes = Object.keys(cp_data[tp]); 

        // add genotypes if not present already
        $.each(gtypes, function(idx, g) {
            if (Object.keys(emergence_values).indexOf(g) == -1) { 
                emergence_values[g] = cp_data[tp][g];
            }
        })
    });

    return emergence_values;
};

/* function to get the timepoint that each genotype emerges
* @param {Object} curVizObj
*/
function _ts_getEmergenceTimepoints(curVizObj) {
    var cp_data = curVizObj.tsData.cp_data,
        emergence_tps = {},
        gtypes;

    // for each time point
    curVizObj.tsData.timepoints.forEach(function(tp) { 

        // get genotypes
        gtypes = Object.keys(cp_data[tp]); 

        // add genotypes if not present already
        $.each(gtypes, function(idx, g) {
            if (Object.keys(emergence_tps).indexOf(g) == -1) { 
                emergence_tps[g] = tp;
            }
        })
    });

    return emergence_tps;
};

/* function to get the genotype-centric cellular prevalence data from the time-centric cellular prevalence data
* @param {Object} curVizObj
*/
function _ts_getGenotypeCPData(curVizObj) {
    var cp_data = curVizObj.tsData.cp_data,
        genotype_cp = {};

    Object.keys(cp_data).forEach(function(tp, tp_idx) {
        Object.keys(cp_data[tp]).forEach(function(gtype, gtype_idx) {
            genotype_cp[gtype] = genotype_cp[gtype] || {};
            genotype_cp[gtype][tp] = cp_data[tp][gtype];
        });
    }); 

    curVizObj.tsData.genotype_cp = genotype_cp;
}

// LAYOUT FUNCTIONS

/* function to get the layout of the timesweep, different depending on whether user wants centred,
* stacked or spaced view
* @param {Object} curVizObj
*/
function _ts_getLayout(curVizObj) {
    var gtypePos = curVizObj.userConfig.genotype_position;


    // traverse the tree to sort the genotypes into a final vertical stacking order (incorporating hierarchy)
    curVizObj.tsData.layoutOrder = _ts_getLayoutOrder(curVizObj.tsGeneralConfig, 
                                                        curVizObj.tsData.treeStructure, 
                                                        curVizObj.tsData.emergence_values,
                                                        curVizObj.tsData.emergence_tps, 
                                                        curVizObj.tsData.timepoints,
                                                        [],
                                                        curVizObj.userConfig.sort_gtypes);

    // ------> CENTRED 
    if (gtypePos == "centre") {

        // get layout of each genotype at each timepoint
        curVizObj.tsData.layout = {};
        $.each(curVizObj.tsData.timepoints, function(tp_idx, tp) { 
            _ts_getCentredLayout(curVizObj, curVizObj.tsData.treeStructure, tp, curVizObj.tsData.layout, 0);
        })
    }

    // ------> STACKED and SPACED
    else {

        // get layout of each genotype at each timepoint
        if (gtypePos == "stack") {
            curVizObj.tsData.layout = _ts_getStackedLayout(curVizObj);
        }
        else if (gtypePos == "space") {
            curVizObj.tsData.layout = _ts_getSpacedLayout(curVizObj); 
        }
    }   

    // SHIFT EMERGENCE X-COORDINATES

    // in the layout, shift x-values if >1 genotype emerges at the 
    // same time point from the same clade in the tree
    _ts_shiftEmergence(curVizObj)
}

/*
* function to, using the order of genotype emergence (value & tp) and the tree hierarchy, get the vertical
* stacking order of the genotypes
* -- ensures that the *later* children emerge, the *closer* they are to the top of the parent sweep
* @param {Object} dim -- general configurations of the visualization
* @param {Object} timesweep_data -- timesweep data
* @param {Array} emergence_values -- values of genotype emergence
* @param {Array} emergence_tps -- timepoints of genotype emergence
* @param {Array} timepoints -- timepoints in dataset
* @param {Array} layoutOrder -- originally empty array of the final vertical stacking order
* @param {Boolean} sort_by_emerg -- whether or not to vertically sort children by emergence values
*/
function _ts_getLayoutOrder(dim, curNode, emergence_values, emergence_tps, timepoints, layoutOrder, sort_by_emerg) {
    var child_emerg_vals = [], // emergence values of children
        sorted_children, // children sorted by their emergence values
        child_obj; // current child node

    // add the current key id to the final vertical stacking order
    if (curNode.id != dim.phantomRoot) {
        layoutOrder.push(curNode.id);
    }

    // if the current key has children to search through
    if (curNode.children && curNode.children.length > 0) {

        // get emergence value & timepoint of children
        for (i=0; i<curNode.children.length; i++) {
            var emerg_val = emergence_values[curNode.children[i].id],
                emerge_tp = timepoints.indexOf(emergence_tps[curNode.children[i].id]);

            child_emerg_vals.push(
                {
                    "id": curNode.children[i].id,
                    "emerg_val": emerg_val,
                    "tp": timepoints.length - emerge_tp 
                });
            // vertically sort children by their emergence values
            if (sort_by_emerg) {
                sorted_children = _ts_sortByKey(child_emerg_vals, "tp", "emerg_val");
            }
            // do not vertically sort by emergence values
            else {
                sorted_children = _ts_sortByKey(child_emerg_vals, "tp");
            }
        }

        // in the *reverse* order of emergence values, search children
        sorted_children.map(function(child) {
            child_obj = _.findWhere(curNode.children, {id: child.id});
            _ts_getLayoutOrder(dim, child_obj, emergence_values, emergence_tps, timepoints, layoutOrder, sort_by_emerg);
        })
    }

    return layoutOrder;
}

/*
* function to get the layout of the timesweep
* -- ensures that the *later* children emerge, the *closer* they are to the top of the parent sweep
* @param {Object} curVizObj
* @param {Object} curNode -- current key in the tree
* @param {Number} yBottom -- where is the bottom of this genotype, in the y-dimension
*/
function _ts_getCentredLayout(curVizObj, curNode, tp, layout, yBottom) {
    var gtype = curNode.id,
        cp_data = curVizObj.tsData.cp_data,
        timepoints = curVizObj.tsData.timepoints,
        next_tp = timepoints[timepoints.indexOf(tp)+1],
        prev_tp = timepoints[timepoints.indexOf(tp)-1],
        gTypes_curTP = Object.keys(cp_data[tp]), // genotypes with cp data at the CURRENT time point
        // genotypes with cp data at the PREVIOUS time point
        gTypes_prevTP = (cp_data[prev_tp]) ? Object.keys(cp_data[prev_tp]) : undefined, 
        curDescendants = curVizObj.tsData.treeDescendantsArr[gtype],
        gTypeAndDescendants = ($.extend([], curDescendants)),
        nChildren = curNode.children.length,
        childCP = 0, // cumulative amount of cellular prevalence in the children;
        childYBottom, // bottom y-value for the next child
        layoutOrder = curVizObj.tsData.layoutOrder,
        sorted_children, // children sorted by the layout order
        cur_cp = cp_data[tp][gtype],
        prev_cp = (cp_data[prev_tp]) ? cp_data[prev_tp][gtype] : undefined, // CP for this genotype, prev tp
        threshold = curVizObj.tsGeneralConfig.threshold, // cellular prevalence threshold for visibility of a genotype
        // the width of this genotype, including descendants
        width = _ts_calculateWidth(curVizObj, tp, gtype, threshold).width, 
        emerged, // whether or not the genotype emerged at this time point
        disappears = (prev_cp && !cur_cp); // whether this genotype disappears at the current time point
    
    gTypeAndDescendants.push(gtype);
    
    emerged = _ts_getIntersection(gTypeAndDescendants, gTypes_curTP).length > 0 && 
        gTypes_prevTP && 
        _ts_getIntersection(gTypeAndDescendants, gTypes_prevTP).length == 0; 

    // layout for this timepoint
    layout[tp] = layout[tp] || {};

    // if the genotype or any descendants exist at this timepoint, or if the genotype disappears at this time point
    if (cur_cp || (_ts_getIntersection(curDescendants, gTypes_curTP).length > 0) || disappears) {

        // if this genotype emerged at the previous time point
        if (emerged) {

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
            "state": "present",
            "presentChildren": _ts_getIntersection(curVizObj.tsData.direct_descendants[gtype], gTypes_curTP).length
        }

        // mark disappearance state
        if (disappears) {
            layout[tp][gtype]["state"] = "disappears_stretched";
        }
    }

    // if there are children
    if (nChildren > 0) {

        // sort the children by the layout order
        sorted_children = $.extend([], curNode.children);
        sorted_children.sort(_ts_sortByLayoutOrder(layoutOrder));

        // for each child
        for (var i = 0; i < nChildren; i++) {

            // get the y-coordinate for the bottom of the child's interval
            childYBottom = (cur_cp) ? // if the child's direct ancestor has cellular prevalence at this time
                (((i+1)/(nChildren+1)) * cur_cp) + childCP + yBottom : 
                childCP + yBottom;

            // get the child's layout
            _ts_getCentredLayout(curVizObj, sorted_children[i], tp, layout, childYBottom);

            // increase the cellular prevalence of the current genotype's children (+descendants) accounted for
            childCP += _ts_calculateWidth(curVizObj, tp, sorted_children[i].id, threshold).width;
        }
    }
};

/* function to get cellular prevalences for each genotype in a stack, one stack for each time point
* @param {Object} curVizObj
*/
function _ts_getStackedLayout(curVizObj) {
    var layout = {},
        cp_data = curVizObj.tsData.cp_data,
        timepoints = curVizObj.tsData.timepoints,
        layoutOrder = curVizObj.tsData.layoutOrder,
        curDescendants,
        gTypeAndDescendants, // genotype and descendants
        gTypes_curTP, // genotypes with cp data at the CURRENT time point
        effective_cp, // effective cp for this genotype at this timepoint
        width, // width to add for this genotype at this timepoint (includes descendants widths)
        midpoint, // midpoint for emergence
        threshold = curVizObj.tsGeneralConfig.threshold; // cellular prevalence threshold for visibility of a genotype

    // for each timepoint (in order)...
    $.each(timepoints, function(tp_idx, tp) { 

        // stack for this time point (may already be created if disappearance occurs at this time point)
        layout[tp] = layout[tp] || {}; 

        var cp = cp_data[tp], // cellular prevalence data for this time point
            sHeight = 0, // current height of the stack
            prev_tp = timepoints[tp_idx-1],
            next_tp = timepoints[tp_idx+1];

        // ... for each genotype ...
        $.each(layoutOrder, function(gtype_idx, gtype) { 
            gTypes_curTP = Object.keys(cp_data[tp]); 
            gTypes_prevTP = (cp_data[prev_tp]) ? Object.keys(cp_data[prev_tp]) : undefined; 
            curDescendants = curVizObj.tsData.treeDescendantsArr[gtype];
            gTypeAndDescendants = ($.extend([], curDescendants)); 
            gTypeAndDescendants.push(gtype); 
            
            // calculate effective cellular prevalence 
            // "effective" because: 
            //                  - it is increased if it's below the threshold
            //                  - it is reduced if siblings are below threshold and therefore increased
            effective_cp = _ts_calculateWidth(curVizObj, tp, gtype, threshold).effective_cp;
            width = _ts_calculateWidth(curVizObj, tp, gtype, threshold).width;


            // DISAPPEARING LINEAGE
            // if this genotype existed at the prev time point, 
            // but neither it nor its descendants are currently present
            if (cp_data[prev_tp] && cp_data[prev_tp][gtype] && !cp_data[tp][gtype] && 
                _ts_getIntersection(gTypeAndDescendants, gTypes_curTP).length == 0) {
                _ts_createStackElement(curVizObj, layout, tp, gtype, sHeight, sHeight, effective_cp, "disappears_stretched");
            }

            // NON-DISAPPEARING LINEAGE
            else {

                // if this genotype is REPLACED by any descendant at this time point
                if (!cp_data[tp][gtype] && (_ts_getIntersection(curDescendants, gTypes_curTP).length > 0)) {

                    _ts_createStackElement(curVizObj, layout, tp, gtype, sHeight, sHeight + width, effective_cp, "replaced");
                    midpoint = (layout[tp][gtype]["bottom"] + layout[tp][gtype]["top"])/2;

                }

                // if this genotype or any descendants EXIST at this time point
                else if (_ts_getIntersection(gTypeAndDescendants, gTypes_curTP).length > 0) {
                    var n_desc_present = _ts_getIntersection(curDescendants, gTypes_curTP).length;

                    // create it as present
                    _ts_createStackElement(curVizObj, layout, tp, gtype, sHeight, sHeight + width, effective_cp, "present");
                    midpoint = (layout[tp][gtype]["bottom"] + layout[tp][gtype]["top"])/2;

                    // update stack height
                    sHeight += effective_cp;
                }


                // if it EMERGED at the previous time point
                if (cp_data[prev_tp] &&
                    (_ts_getIntersection(gTypeAndDescendants, gTypes_prevTP).length == 0) &&
                    (gTypes_curTP && _ts_getIntersection(gTypeAndDescendants, gTypes_curTP).length > 0)) {

                    // update its emergence y-value
                    _ts_createStackElement(curVizObj, layout, prev_tp, gtype, midpoint, midpoint, effective_cp, "emerges");
                }
            }
        })
    })

    return layout;
}

/* function to get cellular prevalences for each genotype in a *spaced* stack, one stack for each time point
* @param {Object} curVizObj
*/
function _ts_getSpacedLayout(curVizObj) {
    var layout = {},
        cp_data = curVizObj.tsData.cp_data,
        timepoints = curVizObj.tsData.timepoints,
        layoutOrder = curVizObj.tsData.layoutOrder,
        curDescendants,
        gTypeAndDescendants, // genotype and descendants
        curAncestors, // all ancestors of current genotype
        gTypes_curTP, // genotypes with cp data at the CURRENT time point
        gTypes_nextTP, // genotypes with cp data at the NEXT time point
        width, // the cp as the width to add for this genotype at this timepoint
        midpoint, // midpoint for emergence
        ancestor_midpoint, // ancestor's midpoint for emergence
        direct_ancestors = curVizObj.tsData.direct_ancestors, // direct ancestor for each genotype
        direct_descendants = curVizObj.tsData.direct_descendants, // direct descendant for each genotype
        space = 8/curVizObj.tsGeneralConfig.height; // space between genotypes (in pixels) 

    // GET STACKED LAYOUT

    layout = _ts_getStackedLayout(curVizObj);

    // SPACE THE STACKED LAYOUT

    // for each timepoint (in order)...
    $.each(timepoints, function(tp_idx, tp) { 

        var seenGTypes = [];
        prev_tp = timepoints[tp_idx-1];

        // ... for each genotype ...
        $.each(layoutOrder, function(gtype_idx, gtype) {

            // if the genotype hasn't already been spaced, and nor is it the root
            if (seenGTypes.indexOf(gtype) == -1) {

                gTypes_curTP = Object.keys(cp_data[tp]);
                var cur_ancestor = direct_ancestors[gtype],
                    cur_ancestor_cp = cp_data[tp][cur_ancestor] || 0,
                    cur_siblings = direct_descendants[cur_ancestor],
                    present_siblings = _ts_getIntersection(direct_descendants[cur_ancestor], gTypes_curTP),
                    cur_space = ((present_siblings.length+1) * space < cur_ancestor_cp) ? 
                        space : 
                        cur_ancestor_cp/(present_siblings.length+1);

                // sort children by reverse layout order (top to bottom (in terms of y-value))
                var sorted_present_sibs = present_siblings.sort(_ts_sortByLayoutOrder(layoutOrder)).reverse();
                var sorted_cur_sibs = cur_siblings.sort(_ts_sortByLayoutOrder(layoutOrder)).reverse();

                if (sorted_present_sibs.length > 0) {

                    // set the stack height (from the top)
                    // if there's an ancestor 
                    if (layout[tp][cur_ancestor]) {
                        sHeight = (layout[tp][cur_ancestor]["top"] == layout[tp][cur_ancestor]["bottom"]) ?
                            // if the ancestor has been replaced, set stack top as the first sibling's top value
                            layout[tp][sorted_siblings[0]]["top"] : 
                            // otherwise, set the top as the ancestor's top value
                            layout[tp][cur_ancestor]["top"]; 
                    }
                    // no ancestor
                    else {
                        sHeight = 1;
                    }

                    // for each sibling
                    for (var i = 0; i < sorted_cur_sibs.length; i++) {

                        // current sibling
                        var sib = sorted_cur_sibs[i]; 

                        // width of sibling
                        var cur_width = (layout[tp][sib]) ? 
                            // if the sibling (or its descendants) exist at this time point
                            layout[tp][sib]["top"] - layout[tp][sib]["bottom"] :
                            // sibling doesn't exist at this tp, nor does any of its descendants
                            0; 

                        // if sibling exists, alter its layout at this timepoint
                        if (layout[tp][sib]) {
                            layout[tp][sib]["top"] = sHeight - cur_space;
                            layout[tp][sib]["bottom"] = sHeight - cur_width - cur_space;
                        }

                        // if this sibling emerges at the previous time point, update its emergence y-coordinate
                        if (cp_data[prev_tp] && layout[prev_tp][sib] && layout[prev_tp][sib]["state"] == "emerges") {
                            midpoint = (layout[tp][sib]["top"] + layout[tp][sib]["bottom"])/2;
                            layout[prev_tp][sib]["top"] = midpoint;
                            layout[prev_tp][sib]["bottom"] = midpoint;
                        }

                        // add the current sibling's width to the stack height
                        sHeight -= (cur_width + cur_space);
                        seenGTypes.push(sib);

                        // note the amount of space subtracted from ancestor's cellular prevalence
                        if (i == (sorted_present_sibs.length-1) && layout[tp][cur_ancestor]) {
                            layout[tp][cur_ancestor]["space"] = (i+1)*cur_space;
                        }
                    }
                }
            }
        })
    })

    return layout;
}

/* function to create a stack element (a genotype interval at a particular time point)
* @param {Object} curVizObj
* @param {Object} layout -- layout of each genotype at each time point
* @param {String} tp -- time point of interest
* @param {String} gtype -- genotype of interest
* @param {Number} bottom_val -- value for the bottom of the interval
* @param {Number} top_val -- value for the top of the interval
* @param {Number} effective_cp -- the cellular prevalence value for visual plotting 
*                                 (increased if small, decreased if others are small)
* @param {String} state -- state of the genotype at this time point (e.g. "emerges", "present", "disappears")
*/
function _ts_createStackElement(curVizObj, layout, tp, gtype, bottom_val, top_val, effective_cp, state) {
    // create the time point in the stack if it doesn't already exist
    layout[tp] = layout[tp] || {}; 

    // create the genotype in the stack
    layout[tp][gtype] = {
        "bottom": bottom_val,
        "top": top_val,
        "state": state,
        "cp": curVizObj.tsData.cp_data[tp][gtype],
        "effective_cp": effective_cp
    };
}

/* function to calculate effective cellular prevalence and width of each genotype in the timesweep
*
* note: - effective cellular prevalence -- will correspond to the interval width in the stacked layout
*       - "effective" because: 
*                         - it is increased if it's below the threshold
*                         - it is reduced if siblings are below threshold and therefore increased
*       - width -- the effective cellular prevalence PLUS the effective cellular prevalence for its descendants
*
* @param {Object} curVizObj
* @param {String} tp -- time point of interest
* @param {String} gtype -- genotype of interest
* @param {Number} threshold -- threshold cellular prevalence for visual detection
*/
function _ts_calculateWidth(curVizObj, tp, gtype, threshold) {
    var width, // width of this genotype (including all descendants)
        effective_cp, // effective cellular prevalence for this genotype
        cp = curVizObj.tsData.cp_data[tp], // cellular prevalence for this time point
        gTypes_curTP = Object.keys(cp), // genotypes existing at the current time point
        cur_direct_descendants = curVizObj.tsData.direct_descendants[gtype], // current direct descendants of genotype
        sum_increment = 0, // sum of increment to low prevalence genotypes for this time point
        n_gtypes_high_cp = 0; // number of genotypes above threshold cp

    // find out how many genotypes are below threshold at this time point
    for (var i = 0; i < gTypes_curTP.length; i++) {
        if (cp[gTypes_curTP[i]] < threshold) {
            sum_increment += (threshold - cp[gTypes_curTP[i]]);
        }
        else {
            n_gtypes_high_cp++;
        }                
    }

    // --> GENOTYPE DOESN'T EXIST at this time point
    if (!cp[gtype]) {
        // effective cellular prevalence is 0
        effective_cp = 0;
    }


    // --> LOW PREVALENCE -- if this genotype exists at low prevalence
    else if (cp[gtype] < threshold) {
        // effective cellular prevalence is the threshold value
        effective_cp = threshold;
    }

    // --> NORMAL PREVALENCE
    else {
        // for each present sibling with CP below threshold, subtract the sibling's width (including descendants) 
        // from the current genotype, because the sibling's sweep interval will be increased
        effective_cp = cp[gtype];
        // subtract the total increment for low prev CPs, divided by the number of high CP genotypes
        effective_cp -= (sum_increment) / (n_gtypes_high_cp); 
    }
    
    // for each direct descendant, add its cellular prevalence 
    width = effective_cp;
    $.each(cur_direct_descendants, function(desc_idx, desc) {
        width += _ts_calculateWidth(curVizObj, tp, desc, threshold).width;
    })
    return {"width": width, "effective_cp": effective_cp};

}

/* function to sort genotypes by layout order (bottom to top)
* @param {Array} layoutOrder -- vertical order of genotypes for layout purposes
*/
function _ts_sortByLayoutOrder(layoutOrder) {
    return function _ts_sortingFunc(a, b) {
        var sortingArr = layoutOrder;
        if (typeof a === 'object') {
            if (sortingArr.indexOf(a.id) > sortingArr.indexOf(b.id)) {
                return 1;
            }
            return -1;
        }
        else {
            if (sortingArr.indexOf(a) > sortingArr.indexOf(b)) {
                return 1;
            }
            return -1;
        }
    }
}


/* function to shift the emergence in the x-direction if multiple genotypes from the same lineage emerge 
* at the same timepoint
* @param {Object} curVizObj
*/
function _ts_shiftEmergence(curVizObj) {
    var dim = curVizObj.tsGeneralConfig,
        layout = curVizObj.tsData.layout,
        layoutOrder = curVizObj.tsData.layoutOrder,
        timepoints = curVizObj.tsData.timepoints,
        treeAncestorsArr = curVizObj.tsData.treeAncestorsArr,
        treeDescendantsArr = curVizObj.tsData.treeDescendantsArr,
        nPartitions,
        layoutOrder_rev,
        ancestors,
        ancestors_of_ancestor,
        curNPartitions,
        genotypes_xshifted;

    $.each(timepoints, function(tp_idx, tp) { 

        // --> get the number of partitions for this time point <-- //

        // for each genotype (backwards in stacking order -- descendant before ancestral)
        nPartitions = -1;
        layoutOrder_rev = ($.extend([], layoutOrder)).reverse();
        $.each(layoutOrder_rev, function(gtype_idx, gtype) {

            // if the genotype is emerging at this time point
            if (layout[tp][gtype] && (layout[tp][gtype]["state"] == "emerges")) {
                
                // get the ancestors that also emerge at this time point
                ancestors = _ts_findEmergentAncestors(layout, treeAncestorsArr, gtype, tp);
                curNPartitions = ancestors.length+2;

                // if this is the largest number of ancestors so far, update the number of partitions
                if (curNPartitions > nPartitions) {
                    nPartitions = curNPartitions;
                }

            }

        })

        // --> x-shift genotypes <-- //

        // keep track of which genotypes have been x-shifted
        genotypes_xshifted = [];

        // for each genotype (backwards in stacking order -- descendant before ancestral)
        $.each(layoutOrder_rev, function(gtype_idx, gtype) {

            // set the number of partitions
            if (layout[tp][gtype]) {
                layout[tp][gtype]["nPartitions"] = nPartitions;
            }
            
            // if this genotype has not already been x-shifted and emerges at this time point
            if ((genotypes_xshifted.indexOf(gtype) == -1) && layout[tp][gtype] && 
                (layout[tp][gtype]["state"] == "emerges")) {

                // get the ancestors that also emerge at this time point
                ancestors = _ts_findEmergentAncestors(layout, treeAncestorsArr, gtype, tp);

                // x-shift and x-partition for the current genotype (depends on how many of its ancestors emerge)
                layout[tp][gtype]["xShift"] = (ancestors.length+1) / nPartitions;
                
                genotypes_xshifted.push(gtype);

                // for each ancestor that also emerged at this time point
                for (var i = 0; i < ancestors.length; i++) {

                    // find the ancestor's ancestors that also emerge at this time point
                    ancestors_of_ancestor = _ts_findEmergentAncestors(layout, treeAncestorsArr, ancestors[i], tp);
                    
                    // x-shift and x-partition for the current ancestor (depends on how many of its ancestors emerge)
                    layout[tp][ancestors[i]]["xShift"] = (ancestors_of_ancestor.length+1) / nPartitions;

                    genotypes_xshifted.push(ancestors[i]);
                }
            }
        })
    })
}

// LABELS FUNCTIONS

/* function to get cellular prevalence labels for each genotype at each time point, for traditional timesweep view
* @param {Object} curVizObj
*/
function _ts_getTraditionalCPLabels(curVizObj) {
    var dim = curVizObj.tsGeneralConfig,
        layout = curVizObj.tsData.layout,
        labels = [], // array of labels
        data, // data for a genotype at a time point
        label, // current label to add
        curDescendants,
        cp_data_original = curVizObj.tsData.cp_data_original,
        gTypes_curTP; 

    // for each time point
    Object.keys(layout).forEach(function(tp, tp_idx) {
        if (tp != "T0") {

            // for each genotype
            Object.keys(layout[tp]).forEach(function(gtype, gtype_idx) {
                curDescendants = curVizObj.tsData.treeDescendantsArr[gtype];
                gTypes_curTP = Object.keys(curVizObj.tsData.cp_data[tp]); 

                // data for this genotype at this time point
                data = layout[tp][gtype];

                // if the genotype exists at this time point (isn't emerging or disappearing / replaced)
                if ((data.state == "present")) {

                    var nDesc = _ts_getIntersection(curDescendants, gTypes_curTP).length;

                    // add its information 
                    label = {};

                    // CENTRED view
                    if (curVizObj.userConfig.genotype_position == "centre") { 
                        label['tp'] = tp;
                        label['gtype'] = gtype;
                        label['cp'] = cp_data_original[tp][gtype];
                        label['middle'] = data.top - (data.cp/(2*(data.presentChildren+1)));
                        label['type'] = "traditional";
                    }
                    // STACKED view
                    else if (curVizObj.userConfig.genotype_position == "stack") { 
                        label['tp'] = tp;
                        label['gtype'] = gtype;
                        label['cp'] = cp_data_original[tp][gtype];
                        label['middle'] = (2*data.bottom + data.effective_cp)/2; 
                        label['type'] = "traditional";
                    }
                    // SPACED view
                    else if (curVizObj.userConfig.genotype_position == "space") { 
                        label['tp'] = tp;
                        label['gtype'] = gtype;
                        label['cp'] = cp_data_original[tp][gtype];
                        // if this genotype was split for spacing, how much CP has been taken up by the upper splits
                        label['middle'] = (data.space) ? 
                            (2*data.bottom + data.effective_cp - data.space)/2 : 
                            (2*data.bottom + data.effective_cp)/2;
                        label['type'] = "traditional";
                    }
                    
                    labels.push(label);

                }   
                
            })
        }
    });

    return labels;
}

/* function to get cellular prevalence lables for each genotype at each time point, for tracks timesweep view
* @param {Object} curVizObj
*/
function _ts_getSeparateCPLabels(curVizObj) {
    var tracks_paths = curVizObj.tsData.tracks_paths,
        cp_data_original = curVizObj.tsData.cp_data_original,
        labels = [],
        label,
        gtype,
        midpoint,
        path,
        tp; // time point

    // for each genotype
    for (var i = 0; i < tracks_paths.length; i++) {
        gtype = tracks_paths[i]["gtype"];
        midpoint = tracks_paths[i]["midpoint"];
        path = tracks_paths[i]["path"];

        // for each point in the path
        for (var j = 0; j < path.length; j++) {
            tp = path[j]["tp"];

            if (tp != "T0") {

                // if the genotype exists at this time point (isn't emerging or disappearing / replaced)
                if (cp_data_original[tp][gtype]) {
                    label = {};
                    label['tp'] = tp;
                    label['cp'] = cp_data_original[tp][gtype];
                    label['middle'] = midpoint;
                    label['gtype'] = gtype;
                    label['type'] = "tracks";
                    labels.push(label);
                }
            }
        }
    }

    return labels;
}

// PATH FUNCTIONS

/* function to get paths to plot. 
* First gets paths (scale 0 to 1) with straight edges.
* Then gets paths (scale of the plot pixel count) with bezier edges
*/
function _ts_getPaths(curVizObj) {
    var dim = curVizObj.tsGeneralConfig;

    // GET PROPORTIONATE, STRAIGHT EDGED PATHS

    // convert layout at each time point into a list of moves for each genotype's d3 path object
    curVizObj.tsData.tracks_paths = _ts_getSeparatePaths(curVizObj);
    curVizObj.tsData.traditional_paths = _ts_getTraditionalPaths(curVizObj);

    // GET BEZIER PATHS READY FOR PLOTTING

    // convert proportionate paths into paths ready for plotting, with bezier curves
    curVizObj.tsData.bezier_paths = _ts_getBezierPaths(curVizObj.tsData.traditional_paths, dim.tsSVGWidth, dim.tsSVGHeight);
    curVizObj.tsData.tracks_bezier_paths = _ts_getBezierPaths(curVizObj.tsData.tracks_paths, dim.tsSVGWidth, dim.tsSVGHeight);

}

/* function to convert genotype stacks at each time point into a list of moves for each genotype's d3 path object 
* (traditional timesweep view)
* Note: the appearance timepoint is the time at which the genotype appears in the dataset
*       the emergence timepoint is the time at which the genotype must have emerged (appearance timepoint - 1)
* @param {Object} curVizObj
*/
function _ts_getTraditionalPaths(curVizObj) {
    var dim = curVizObj.tsGeneralConfig,
        layout = curVizObj.tsData.layout,
        timepoints = curVizObj.tsData.timepoints,
        timepoints_rev = ($.extend([], timepoints)).reverse(),
        mid_tp = (1/((timepoints.length-1)*2)), // half of x-distance between time points
        layoutOrder = curVizObj.tsData.layoutOrder,
        paths = [],
        cur_path,
        emerges, // whether or not a genotype emerges at a time point
        xShift_in_layout, // the amount of shift in the x-direction for a genotype (when it's emerging), 
                          // as is present in the layout data
        xShift, // the amount of shift in the x-direction for a genotype (when it's emerging), 
                // taking into account events that occur
        nPartitions, // number of partitions between two time points 
        next_tp, 
        xBottom, // x-value at the bottom of the genotype sweep at a time point
        xTop, // x-value at the top of the genotype sweep at a time point
        y_mid, // y proportion as halfway between this and the next time point
        appear_xBottom,
        appear_xTop,
        event_occurs, // whether or not an event occurs after a time point
        event_index, // index of the current event 
        perturbations = curVizObj.userConfig.perturbations, // user specified perturbations in the time-series data
        frac; // fraction of total tumour content remaining at the perturbation event;

    $.each(layoutOrder, function(gtype_idx, gtype) {
        
        // path for the current genotype
        cur_path = {"gtype": gtype, "path":[]};
        
        // for each time point (in sequence)...
        $.each(timepoints, function(idx, tp) {
            
            // whether or not an event occurs after this timepoint
            event_occurs = (_ts_getIntersection(_.pluck(perturbations, "prev_tp"), tp).length > 0);
            event_index = _.pluck(perturbations, "prev_tp").indexOf(tp);

            // if the genotype exists or emerges/disappears at this time point
            if (layout[tp][gtype]) {
                emerges = (layout[tp][gtype]["state"] == "emerges");
                nPartitions = (event_occurs) ?
                    layout[tp][gtype]["nPartitions"]*2 :
                    layout[tp][gtype]["nPartitions"];
                next_tp = timepoints[idx+1];
                xShift_in_layout = (layout[tp][gtype]["xShift"]) ? layout[tp][gtype]["xShift"] : 0;
                xShift = 
                    (event_occurs) ? 
                    0.5 + (xShift_in_layout/2) : 
                    xShift_in_layout;

                // get the x-coordinate for the bottom of this genotype's interval 
                xBottom = (emerges) ? 
                    (idx + xShift)/(timepoints.length-1) : 
                    (idx)/(timepoints.length-1);

                // if the current genotype is ...
                // ... EMERGING at this time point... 
                if (emerges) {

                    // add a path point for the bottom of the genotype's interval at the current time point
                    cur_path["path"].push({ "x": xBottom, 
                                            "y": layout[tp][gtype]["bottom"],
                                            "tp": tp });

                    // ... add a path point to expand the sweep such that its descendants can be contained within it
                    appear_xBottom = (idx + xShift + (1/nPartitions))/(timepoints.length-1);
                    cur_path["path"].push({ "x": appear_xBottom, 
                                        "y": layout[next_tp][gtype]["bottom"],
                                        "tp": tp }); // y-coordinate at next time point
                }   

                // ... NOT EMERGING at this time point
                else {
                    // add a path point for the bottom of the genotype's interval at the current time point
                    cur_path["path"].push({ "x": xBottom, 
                                            "y": layout[tp][gtype]["bottom"],
                                            "tp": tp });

                    // if event occurs after this timepoint
                    if (event_occurs) {

                        frac = perturbations[event_index].frac;

                        // get y proportion as halfway between this and the next time point
                        y_mid = (layout[next_tp][gtype]["bottom"] + layout[tp][gtype]["bottom"])/2;

                        // add a point in the middle
                        cur_path["path"].push({ "x": xBottom + mid_tp, // halfway between this and next tp
                                                "y": (y_mid*frac) + ((1-frac)/2),
                                                "tp": "event" });
                    }

                    // if there are partitions after this timepoint, add a pathpoint at the first partition
                    if (next_tp && layout[next_tp][gtype] && layout[tp][gtype]["nPartitions"] > 1) {
                        var next_xBottom = (idx + xShift + (1/nPartitions))/(timepoints.length-1);
                        cur_path["path"].push({ "x": next_xBottom, 
                                            "y": layout[next_tp][gtype]["bottom"],
                                            "tp": tp });
                    }
                }                            
            }
        })

        // for each time point (in *reverse* sequence)...
        $.each(timepoints_rev, function(idx, tp) {

            // whether or not an event occurs after this timepoint
            event_occurs = (_ts_getIntersection(_.pluck(perturbations, "prev_tp"), tp).length > 0);
            event_index = _.pluck(perturbations, "prev_tp").indexOf(tp);

            // if the genotype exists or emerges/disappears at this time point
            if (layout[tp][gtype]) {
                emerges = (layout[tp][gtype]["state"] == "emerges");
                nPartitions = (event_occurs) ?
                    layout[tp][gtype]["nPartitions"]*2 :
                    layout[tp][gtype]["nPartitions"];
                next_tp = timepoints_rev[idx-1];
                xShift_in_layout = (layout[tp][gtype]["xShift"]) ? layout[tp][gtype]["xShift"] : 0;
                xShift = 
                    (event_occurs) ? 
                    0.5 + (xShift_in_layout/2) : 
                    xShift_in_layout;

                // get the x-coordinate for the top of this genotype's interval 
                xTop = (emerges) ? 
                    ((timepoints.length-1) - idx + xShift)/(timepoints.length-1) : 
                    ((timepoints.length-1) - idx)/(timepoints.length-1);

                // if the current genotype ...
                // ... EMERGES at the current time point...
                if (emerges) {
                    // add a path point to bring forward the sweep such that its descendants can be contained w/in it
                    appear_xTop = ((timepoints.length-1) - idx + xShift + (1/nPartitions))/(timepoints.length-1);
                    cur_path["path"].push({ "x": appear_xTop, 
                                        "y": layout[next_tp][gtype]["top"],
                                        "tp": tp }); // y-coordinate at next time point

                    // add a path point for the top of the genotype's interval at the current time point
                    cur_path["path"].push({ "x": xTop, 
                                            "y": layout[tp][gtype]["top"],
                                            "tp": tp });
                }

                // ... DOESN'T EMERGE at the current time point
                else {


                    // if there are partitions after this timepoint, add a pathpoint at the first partition
                    if (next_tp && layout[next_tp][gtype] && layout[tp][gtype]["nPartitions"] > 1) {
                        var next_xTop = ((timepoints.length-1) - idx + xShift + (1/nPartitions))/(timepoints.length-1);
                        cur_path["path"].push({ "x": next_xTop, 
                                            "y": layout[next_tp][gtype]["top"],
                                            "tp": tp });
                    }

                    // if event occurs after this timepoint
                    if (event_occurs) {

                        frac = perturbations[event_index].frac;

                        // get y proportion as halfway between this and the next time point
                        y_mid = (layout[next_tp][gtype]["top"] + layout[tp][gtype]["top"])/2;

                        // add a point in the middle
                        cur_path["path"].push({ "x": xTop + mid_tp, // halfway between this and next tp
                                                "y": (y_mid*frac) + ((1-frac)/2), 
                                                "tp": "event" });
                    }

                    // add a path point for the top of the genotype's interval at the current time point
                    cur_path["path"].push({ "x": xTop, 
                                            "y": layout[tp][gtype]["top"],
                                            "tp": tp });
                }   
            }
        })
        
        // add the path for this genotype to the list of all paths to plot
        paths.push(cur_path);
    })

    return paths;
}

/* function to convert genotype stacks at each time point into a list of moves for each genotype's d3 path object 
* (tracks timesweep view)
* Note: the appearance timepoint is the time at which the genotype appears in the dataset
*       the emergence timepoint is the time at which the genotype must have emerged (appearance timepoint - 1)
* @param {Object} curVizObj
*/
function _ts_getSeparatePaths(curVizObj) {
    var dim = curVizObj.tsGeneralConfig,
        timepoints = curVizObj.tsData.timepoints,
        timepoints_rev = ($.extend([], timepoints)).reverse(),
        layoutOrder = curVizObj.tsData.layoutOrder,
        genotype_cp = curVizObj.tsData.genotype_cp,
        layout = curVizObj.tsData.layout,
        padding = 0.03,
        ts_sep_labels = curVizObj.tsData.ts_sep_labels,
        paths = [],
        sHeight = 0,
        seenGTypes = [],
        largest_cps = {},
        scaled_midpoint,
        entry_exit_options,
        entry_exit,
        xShift,
        x,
        y,
        cur_path,
        full_padding,
        denominator;

    // find the denominator (total height of the view), in terms of the sweeps (sum of largest cp for each genotype)
    Object.keys(genotype_cp).forEach(function(gtype, gtype_idx) {
        var cps = Object.keys(genotype_cp[gtype]).map(function (key) { return genotype_cp[gtype][key]; });
        largest_cps[gtype] = Math.max(...cps);
    })
    denominator = Object.keys(largest_cps).map(function (key) { return largest_cps[key]; }).reduce(function(a, b) {
        return a + b;
    }); 
    full_padding = padding * (Object.keys(largest_cps).length+1); // padding between each genotype (+ above & below)
    denominator += full_padding;

    // for each genotype, get its path through the time points
    $.each(layoutOrder, function(gtype_idx, gtype) {

        if (Object.keys(largest_cps).indexOf(gtype) != -1) {

            // scaled midpoint for this genotype's timesweep band
            scaled_midpoint = (largest_cps[gtype] / denominator)/2 + sHeight;
            scaled_midpoint += ((seenGTypes.length)/(Object.keys(largest_cps).length+1)) * full_padding/denominator;

            // path for the current genotype
            cur_path = {"gtype": gtype, "midpoint": scaled_midpoint, "path":[]};
            
            // BOTTOM COORDINATE for each time point 
            $.each(timepoints, function(tp_idx, tp) {

                // xShift info
                entry_exit_options = ["disappears_stretched", "emerges", "replaced"];
                entry_exit = (layout[tp][gtype]) ? 
                    (entry_exit_options.indexOf(layout[tp][gtype]["state"]) != -1) : 
                    false;
                xShift = (layout[tp][gtype] && layout[tp][gtype]["xShift"]) ? layout[tp][gtype]["xShift"] : 0;

                if (entry_exit || genotype_cp[gtype][tp]) {
                    // add this genotype to the seen genotypes
                    if (seenGTypes.indexOf(gtype) == -1) {
                        seenGTypes.push(gtype);
                    }

                    // add the path point
                    x = (tp_idx + xShift)/(timepoints.length-1);
                    y = genotype_cp[gtype][tp] ? 
                        scaled_midpoint - (genotype_cp[gtype][tp] / denominator)/2 : 
                        scaled_midpoint;
                    cur_path["path"].push({ "x": x, "y": y, "tp": tp, "cp": genotype_cp[gtype][tp]});
                }
            });

            // TOP COORDINATE for each time point (in *reverse* sequence)...
            $.each(timepoints_rev, function(tp_idx, tp) {

                // xShift info
                entry_exit_options = ["disappears_stretched", "emerges", "replaced"];
                entry_exit = (layout[tp][gtype]) ? 
                    (entry_exit_options.indexOf(layout[tp][gtype]["state"]) != -1) : 
                    false;
                xShift = (layout[tp][gtype] && layout[tp][gtype]["xShift"]) ? layout[tp][gtype]["xShift"] : 0;

                // add the path point
                if (entry_exit || genotype_cp[gtype][tp]) {
                    x = ((timepoints.length-1) - tp_idx + xShift)/(timepoints.length-1);
                    y = genotype_cp[gtype][tp] ? 
                        scaled_midpoint + (genotype_cp[gtype][tp] / denominator)/2 : 
                        scaled_midpoint;
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


/* function to calculate and return a path representing a horizontal line through the centre of the timesweep svg 
* @param {Object} curVizObj
*/
function _ts_centreLine(curVizObj) {
    var tsSVGWidth = curVizObj.tsGeneralConfig.tsSVGWidth, // timesweep svg width
        tsSVGHeight = curVizObj.tsGeneralConfig.tsSVGHeight; // timesweep svg height

    return "M 0 " + tsSVGHeight/2 + " L " + tsSVGWidth + " " + tsSVGHeight/2 + " L 0 " + tsSVGHeight/2;
}

/* tween function to transition to the next path ("path" in the data)
* @param {Object} curVizObj
* @param {String} type - the type of transition ("move" or otherwise - if otherwise, will move to centre line)
* Note: situations other than "move" - could be an exit situation, where the next path is blank
*/
function _ts_pathTween(curVizObj, type) { 
    
    var precision = 4;

    return function() {
        var dest_path,
            path0,
            path1,
            n0, 
            n1,
            distances,
            points,
            p0,
            p1;

        // for an exit situation, the path to move to is a line in the centre of the timesweep svg
        dest_path = (type == "move") ? this.__data__.path : _ts_centreLine(curVizObj); 
        path0 = this;
        path1 = path0.cloneNode();
        n0 = path0.getTotalLength();
        n1 = (path1.setAttribute("d", dest_path), path1).getTotalLength();

        // Uniform sampling of distance based on specified precision.
        distances = [0], i = 0, dt = precision / Math.max(n0, n1);
        while ((i += dt) < 1) distances.push(i);
        distances.push(1);
        // Compute point-interpolators at each distance.
        points = distances.map(function(t) {
            p0 = path0.getPointAtLength(t * n0);
            p1 = path1.getPointAtLength(t * n1);
            return d3.interpolate([p0.x, p0.y], [p1.x, p1.y]);
        });
        return function(t) {
            return t < 1 ? "M" + points.map(function(p) { return p(t); }).join("L") : dest_path;
        };
    };
}

/* function to convert straight paths for each genotype to bezier curve paths
* @param {Object} paths -- straight path for each genotype
* @param {Number} tsSVGWidth -- width of the timesweep svg
* @param {Number} tsSVGHeight -- height of the timesweep svg
*/
function _ts_getBezierPaths(paths, tsSVGWidth, tsSVGHeight) {

    var bezier_paths = [],
        path,
        bezier_path,
        xsource,
        xtarget,
        ysource,
        ytarget,
        diagonal;

    // for each genotype's path
    $.each(paths, function(path_idx, cur_path) { 

        path = cur_path['path'];
        bezier_path = "";

        // for each point in the path, get its diagonal to the next point
        for (var i = 0; i < path.length-1; i++) {
            xsource = path[i].x * tsSVGWidth;
            xtarget = path[i+1].x * tsSVGWidth;
            ysource = path[i].y * tsSVGHeight;
            ytarget = path[i+1].y * tsSVGHeight;

            // diagonal line generator for bezier curve between two points
            diagonal = d3.svg.diagonal()
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

// COLOUR FUNCTIONS


/* function to get the greyscale equivalent of a particular colour
*/
function _ts_getGreyscaleEquivalent(col) {
    brightness = Math.round(_ts_get_brightness(col));
    return _ts_rgb2hex("rgb(" + brightness + "," + brightness + "," + brightness + ")");
}

/* function to calculate colours based on phylogeny 
* @param {Object} curVizObj -- vizObj for the current view
*/
function _ts_getPhyloColours(curVizObj) {

    var colour_assignment = {}, // standard colour assignment
        alpha_colour_assignment = {}, // alpha colour assignment
        cur_colours = curVizObj.userConfig.clone_cols;

    // clone colours specified
    if (cur_colours != "NA") {
        // get colour assignment - use specified colours
        // handling different inputs -- TODO should probably be done in R
        cur_colours.forEach(function(col, col_idx) {
            var col_value = col.colour;
            if (col_value[0] != "#") { // append a hashtag if necessary
                col_value = "#".concat(col_value);
            }
            if (col_value.length > 7) { // remove any alpha that may be present in the hex value
                col_value = col_value.substring(0,7);
            }
            colour_assignment[col.clone_id] = col_value;
        });
    }

    // clone colours not specified
    else {
        var s = 0.88, // saturation
            l = 0.77; // lightness

        // number of nodes
        var n_nodes = curVizObj.tsData.treeChainRoots.length;

        // colour each tree chain root a sequential colour from the spectrum
        for (var i = 0; i < n_nodes; i++) {
            var cur_node = curVizObj.tsData.treeChainRoots[i];
            var h = (i/n_nodes + 0.96) % 1;
            var rgb = _ts_hslToRgb(h, s, l); // hsl to rgb
            var col = _ts_rgb2hex("rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")"); // rgb to hex

            colour_assignment[cur_node] = col;

            // for each of the chain's descendants
            var prev_colour = col;
            curVizObj.tsData.treeChains[cur_node].forEach(function(desc, desc_i) {
                // if we're on the phantom root's branch and it's the first descendant
                if (cur_node == curVizObj.tsGeneralConfig.phantomRoot && desc_i == 0) {

                    // do not decrease the brightness
                    colour_assignment[desc] = prev_colour;
                }
                // we're not on the phantom root branch's first descendant
                else {
                    // colour the descendant a lighter version of the previous colour in the chain
                    colour_assignment[desc] = 
                        _ts_decrease_brightness(prev_colour, 20);

                    // set the previous colour to the lightened colour
                    prev_colour = colour_assignment[desc]; 
                }
            })
        }
    }
    curVizObj.tsView.colour_assignment = colour_assignment;  

    // get the alpha colour assignment
    Object.keys(colour_assignment).forEach(function(key, key_idx) {
        alpha_colour_assignment[key] = 
            _ts_increase_brightness(colour_assignment[key], curVizObj.userConfig.alpha);
    });
    curVizObj.tsView.alpha_colour_assignment = alpha_colour_assignment;
}

// Check color brightness
// returns brightness value from 0 to 255
// http://www.webmasterworld.com/forum88/9769.htm
function _ts_get_brightness(hexCode) {
    if (hexCode == undefined) {
        return undefined;
    }

    // strip off any leading #
    hexCode = hexCode.replace('#', '');

    var c_r = parseInt(hexCode.substr(0, 2),16);
    var c_g = parseInt(hexCode.substr(2, 2),16);
    var c_b = parseInt(hexCode.substr(4, 2),16);

    return ((c_r * 299) + (c_g * 587) + (c_b * 114)) / 1000;
}

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  l       The lightness
 * @return  Array           The RGB representation
 */
function _ts_hslToRgb(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        var hue2rgb = function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// convert RGB to hex
// http://stackoverflow.com/questions/1740700/get-hex-value-rather-than-rgb-value-using-jquery
function _ts_rgb2hex(rgb) {
     if (  rgb.search("rgb") == -1 ) {
          return rgb;
     } else {
          rgb = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+))?\)$/);
          function hex(x) {
               return ("0" + parseInt(x).toString(16)).slice(-2);
          }
          return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]); 
     }
}

// function to increase brightness of hex colour
// from: http://stackoverflow.com/questions/6443990/javascript-calculate-brighter-colour
function _ts_increase_brightness(hex, percent){
    // strip the leading # if it's there
    hex = hex.replace(/^\s*#|\s*$/g, '');

    // convert 3 char codes --> 6, e.g. `E0F` --> `EE00FF`
    if(hex.length == 3){
        hex = hex.replace(/(.)/g, '$1$1');
    }

    var r = parseInt(hex.substr(0, 2), 16),
        g = parseInt(hex.substr(2, 2), 16),
        b = parseInt(hex.substr(4, 2), 16);

    return '#' +
       ((0|(1<<8) + r + (256 - r) * percent / 100).toString(16)).substr(1) +
       ((0|(1<<8) + g + (256 - g) * percent / 100).toString(16)).substr(1) +
       ((0|(1<<8) + b + (256 - b) * percent / 100).toString(16)).substr(1);
}

// function to decrease brightness of hex colour
// from: http://stackoverflow.com/questions/12660919/javascript-brightness-function-decrease
function _ts_decrease_brightness(hex, percent){
    var r = parseInt(hex.substr(1, 2), 16),
        g = parseInt(hex.substr(3, 2), 16),
        b = parseInt(hex.substr(5, 2), 16);

   return '#' +
       ((0|(1<<8) + r * (100 - percent) / 100).toString(16)).substr(1) +
       ((0|(1<<8) + g * (100 - percent) / 100).toString(16)).substr(1) +
       ((0|(1<<8) + b * (100 - percent) / 100).toString(16)).substr(1);
}

// MUTATION FUNCTIONS

/* function to get the mutations into a better format
* @param {Object} curVizObj -- vizObj for the current view
*/
function _ts_reformatMutations(curVizObj) {
    var original_muts = curVizObj.userConfig.mutations, // muts from user data
        muts_arr = [];

    // convert object into array
    original_muts.forEach(function(mut) {

        // link id where mutation occurred
        var link_id = "treeLink_source_" + curVizObj.tsData.direct_ancestors[mut.clone_id] + "_target_" +  mut.clone_id;

        // add this gene to the array
        var cur_mut = {
            "chrom": mut.chrom,
            "coord": mut.coord,
            "empty": "", // add an empty string for an empty column (clone column) that will contain an SVG
            "link_id": link_id,
            "clone_id": mut.clone_id
        }
        if (mut.hasOwnProperty("gene_name")) {
            cur_mut["gene_name"] = mut.gene_name;
        }
        if (mut.hasOwnProperty("effect")) {
            cur_mut["effect"] = mut.effect;
        }
        if (mut.hasOwnProperty("impact")) {
            cur_mut["impact"] = mut.impact;
        }
        if (mut.hasOwnProperty("nuc_change")) {
            cur_mut["nuc_change"] = mut.nuc_change;
        }
        if (mut.hasOwnProperty("aa_change")) {
            cur_mut["aa_change"] = mut.aa_change;
        }
        muts_arr.push(cur_mut);
    });

    curVizObj.tsData.mutations = muts_arr;
}

// GENERAL FUNCTIONS

/* function to get the intersection of two arrays
* @param {Array} array1 -- first array
* @param {Array} array2 -- second array
*/
function _ts_getIntersection(array1, array2) {

    if (array1 == undefined || array2 == undefined) {
        return [];
    }

    return array1.filter(function(n) {
        return array2.indexOf(n) != -1
    });
}

/* function to sort a 2D array by the second value in each contained array, 
* @returns the sorted first elements of each contained array 
*/
function _ts_sort2DArrByValue(obj)
{
    var x,
        y;

    // sort items by value
    obj.sort(function(a, b)
    {
        x=a[1];
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

/* function to download PNG
* @param className -- name of the class of the svg to download (e.g. "mySVG")
* @param fileOutputName -- filename for output
*/
function _ts_downloadPNG(className, fileOutputName) {
    // get current margin of svg element
    var cur_margin = d3.select("." + className).style("margin");

    // temporarily remove the margin so the view isn't cut off
    d3.select("." + className)
        .style("margin", "0px");

    var html = d3.select("." + className)
        .attr("version", 1.1)
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .node().parentNode.innerHTML;

    var imgsrc = 'data:image/svg+xml;base64,'+ btoa(html);

    var canvas = document.querySelector("canvas"),
        context = canvas.getContext("2d");

    var image = new Image;
    image.src = imgsrc;
    image.onload = function() {
        context.drawImage(image, 0, 0);

        var canvasdata = canvas.toDataURL("image/png");

        var pngimg = '<img src="'+canvasdata+'">'; 

        var a = document.createElement("a");
        a.download = fileOutputName;
        a.href = canvasdata;
        a.click();
    };

    // reset the margin of the svg element
    d3.select("." + className)
        .style("margin", cur_margin);
}

/* function to sort array of objects by key 
* modified from: http://stackoverflow.com/questions/8837454/sort-array-of-objects-by-single-key-with-date-value
*/
function _ts_sortByKey(array, firstKey, secondKey) {
    secondKey = secondKey || "NA";
    return array.sort(function(a, b) {
        var x = a[firstKey]; var y = b[firstKey];
        var res = ((x < y) ? -1 : ((x > y) ? 1 : 0));
        if (secondKey == "NA") {
            return res;            
        }
        else {
            if (typeof(a[secondKey] == "string")) {
                return (res == 0) ? (a[secondKey] > b[secondKey]) : res;
            }
            else if (typeof(a[secondKey] == "number")) {
                return (res == 0) ? (a[secondKey] - b[secondKey]) : res;
            }
            else {
                return res;
            }
        }
    });
}
