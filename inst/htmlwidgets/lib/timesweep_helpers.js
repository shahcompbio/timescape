// FUNCTIONS

function _sweepClick(vizObj) {
    var dim = vizObj.view.config,
        colour_assignment = vizObj.view.colour_assignment,
        alpha_colour_assignment = vizObj.view.alpha_colour_assignment,
        x = vizObj.data.userConfig;

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
            .attr('fill', function(d) { 
                return (x.alpha == "NA") ? colour_assignment[d.gtype] : alpha_colour_assignment[d.gtype];
            }) 
            .attr('stroke', function(d) { 
                return (d.gtype == "Root" && dim.showRoot) ? dim.rootColour : colour_assignment[d.gtype]; 
            })
            .attr('fill-opacity', function(d) {
                return (d.gtype == "Root" && !dim.showRoot) ? 0 : 1;
            })
            .attr('stroke-opacity', function(d) {
                return (d.gtype == "Root" && !dim.showRoot) ? 0 : 1;
            })
            .transition()
            .duration(1000)
            .attrTween("d", _pathTween(vizObj, "move"));
    }
    dim.switchView = !dim.switchView;
}

function _sweepMouseover(d, vizObj) {
    var curGtype = d.gtype,
        brightness,
        col,
        dim = vizObj.view.config,
        colour_assignment = vizObj.view.colour_assignment,
        alpha_colour_assignment = vizObj.view.alpha_colour_assignment,
        patientID_class = 'patientID_' + vizObj.data.patient_id,
        x = vizObj.data.userConfig;

    // dim other genotypes
    d3.selectAll('.tsPlot.' + patientID_class)
        .attr('fill', function(d) { 
            if (d.gtype == "Root") {
                return dim.rootColour;
            }
            else if (d.gtype != curGtype) {
                col = (x.alpha == "NA") ? colour_assignment[d.gtype] : alpha_colour_assignment[d.gtype];
                brightness = Math.round(_get_brightness(col));
                return _rgb2hex("rgb(" + brightness + "," + brightness + "," + brightness + ")");
            }
            else {
                return (x.alpha == "NA") ? colour_assignment[d.gtype] : alpha_colour_assignment[d.gtype];
            }
        })
        .attr('stroke', function(d) { 
            if (d.gtype == "Root") {
                return dim.rootColour;
            }
            else if (d.gtype != curGtype) {
                brightness = Math.round(_get_brightness(colour_assignment[d.gtype]));
                return _rgb2hex("rgb(" + brightness + "," + brightness + "," + brightness + ")");
            }
            else {
                return (d.gtype == "Root" && dim.showRoot) ? dim.rootColour : colour_assignment[d.gtype];
            }
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
}

function _sweepMouseout(d, vizObj) {
    var curGtype = d.gtype,
        dim = vizObj.view.config,
        colour_assignment = vizObj.view.colour_assignment,
        alpha_colour_assignment = vizObj.view.alpha_colour_assignment,
        patientID_class = 'patientID_' + vizObj.data.patient_id,
        x = vizObj.data.userConfig;

    // reset colours
    d3.selectAll('.tsPlot.' + patientID_class)
        .attr('fill', function(d) { 
            return (x.alpha == "NA") ? colour_assignment[d.gtype] : alpha_colour_assignment[d.gtype];
        })
        .attr('stroke', function(d) { 
            return (d.gtype == "Root" && dim.showRoot) ? dim.rootColour : colour_assignment[d.gtype];
        });

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
}

/*
* function to get the layout of the timesweep
* @param {Object} vizObj
* @param {Object} curNode -- current key in the tree
* @param {Number} yBottom -- where is the bottom of this genotype, in the y-dimension
*/
function _getCentredLayout(vizObj, curNode, tp, layout, yBottom) {
    var gtype = curNode.id,
        cp_data = vizObj.data.cp_data,
        timepoints = vizObj.data.timepoints,
        next_tp = timepoints[timepoints.indexOf(tp)+1],
        prev_tp = timepoints[timepoints.indexOf(tp)-1],
        gTypes_curTP = Object.keys(cp_data[tp]), // genotypes with cp data at the CURRENT time point
        gTypes_prevTP = (cp_data[prev_tp]) ? Object.keys(cp_data[prev_tp]) : undefined, // genotypes with cp data at the PREVIOUS time point
        curDescendants = vizObj.data.treeDescendantsArr[gtype],
        gTypeAndDescendants = ($.extend([], curDescendants)),
        nChildren = curNode.children.length,
        childCP = 0, // cumulative amount of cellular prevalence in the children;
        childYBottom, // bottom y-value for the next child
        layoutOrder = vizObj.data.layoutOrder,
        sorted_children, // children sorted by the layout order
        cur_cp = cp_data[tp][gtype],
        prev_cp = (cp_data[prev_tp]) ? cp_data[prev_tp][gtype] : undefined, // cellular prevalence for this genotype at the previous time point
        width = _calculateWidth(vizObj, tp, gtype), // the width of this genotype at this time point, including all descendants
        emerged, // whether or not the genotype emerged at this time point
        disappears = (prev_cp && !cur_cp); // whether this genotype disappears at the current time point
    
    gTypeAndDescendants.push(gtype);
    
    emerged = _getIntersection(gTypeAndDescendants, gTypes_curTP).length > 0 && 
        gTypes_prevTP && 
        _getIntersection(gTypeAndDescendants, gTypes_prevTP).length == 0 && 
        gtype != "Root"; 

    // layout for this timepoint
    layout[tp] = layout[tp] || {};

    // if the genotype or any descendants exist at this timepoint, or if the genotype disappears at this time point
    if (cur_cp || (_getIntersection(curDescendants, gTypes_curTP).length > 0) || disappears) {

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
            "nChildren": nChildren
        }

        // mark disappearance state
        if (disappears) {
            layout[tp][gtype]["state"] = "disappears_stretched";
        }
    }

    // function to sort children by layout order
    function sortByLayoutOrder(a, b) {
      var sortingArr = layoutOrder;
      return sortingArr.indexOf(a.id) - sortingArr.indexOf(b.id);
    }
    
    // if there are children
    if (nChildren > 0) {

        // sort the children by the layout order
        sorted_children = $.extend([], curNode.children);
        sorted_children.sort(sortByLayoutOrder);    

        // for each child
        for (var i = 0; i < nChildren; i++) {

            // get the y-coordinate for the bottom of the child's interval
            childYBottom = (cur_cp) ? 
                (((i+1)/(nChildren+1)) * cur_cp) + childCP + yBottom : // if the child's direct ancestor has cellular prevalence at this time
                childCP + yBottom;

            // get the child's layout
            _getCentredLayout(vizObj, sorted_children[i], tp, layout, childYBottom);

            // increase the cellular prevalence of the current genotype's children (+descendants) accounted for
            childCP += _calculateWidth(vizObj, tp, sorted_children[i].id);
        }
    }
};

/* function to get the width of this genotype at this time point, including all descendants
* @param {Object} vizObj
* @param {String} tp -- current time point
* @param {String} gtype -- current genotype
*/
function _calculateWidth(vizObj, tp, gtype) {
    var cp_data = vizObj.data.cp_data,
        cur_cp = cp_data[tp][gtype] || 0,
        curDescendants = vizObj.data.treeDescendantsArr[gtype],
        width = cur_cp || 0; // width starts out as the cellular prevalence for this genotype at this time point

    // for each descendant, add its cellular prevalence at this time to the genotype's width
    $.each(curDescendants, function(desc_idx, desc) {
        width += cp_data[tp][desc] || 0;
    })

    return width;
}

/* function to get the intersection of two arrays
* @param {Array} array1 -- first array
* @param {Array} array2 -- second array
*/
function _getIntersection(array1, array2) {

    if (array1 == undefined || array2 == undefined) {
        return [];
    }

    return array1.filter(function(n) {
        return array2.indexOf(n) != -1
    });
}

/* function to find a key by its name - if the key doesn't exist, it will be created and added to the list of nodes
* @param {Array} list - list of nodes
* @param {String} name - name of key to find
*/
function _findNodeByName(list, name) {
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
function _getDescendantIds(root, descendants) {
    var child;

    if (root["children"].length > 0) {
        for (var i = 0; i < root["children"].length; i++) {
            child = root["children"][i];
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
    var ancestors = {},
        curDescendants;

    // set up each node as originally containing an empty list of ancestors
    Object.keys(nodes).forEach(function(key, idx) {
        ancestors[nodes[key]] = [];
    })

    // get ancestors data from the descendants data
    Object.keys(nodes).forEach(function(key, idx) {
        // for each descendant of this node
        curDescendants = descendants_arr[nodes[key]];
        for (var i = 0; i < curDescendants.length; i++) { 
            // add the node to descentant's ancestor list
            ancestors[curDescendants[i]].push(nodes[key]);
        }
    })

    return ancestors;
}

/* function to get the DIRECT descendant id for all nodes
* @param {Object} curNode -- current node in the tree (originally the root)
* @param {Object} dir_descendants -- originally empty array of direct descendants for each node
*/
function _getDirectDescendants(curNode, dir_descendants) {
    dir_descendants[curNode.id] = [];

    if (curNode.children.length > 0) {
        for (var i = 0; i < curNode.children.length; i++) {
            dir_descendants[curNode.id].push(curNode.children[i].id);
            _getDirectDescendants(curNode.children[i], dir_descendants)
        }
    }

    return dir_descendants;
}

/* function to get the DIRECT ancestor id for all nodes
* @param {Object} curNode -- current node in the tree (originally the root)
* @param {Object} dir_descendants -- originally empty array of direct descendants for each node
*/
function _getDirectAncestors(curNode, dir_ancestors) {

    if (curNode.children.length > 0) {
        for (var i = 0; i < curNode.children.length; i++) {
            dir_ancestors[curNode.children[i].id] = curNode.id;
            _getDirectAncestors(curNode.children[i], dir_ancestors)
        }
    }

    return dir_ancestors;
}

/* function to get the cellular prevalence value for each genotype at its emergence
* @param {Object} vizObj
*/
function _getEmergenceValues(vizObj) {
    var cp_data = vizObj.data.cp_data,
        emergence_values = {},
        gtypes;

    // for each time point
    vizObj.data.timepoints.forEach(function(tp) { 

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

/* function to get the genotype-centric cellular prevalence data from the time-centric cellular prevalence data
* @param {Object} vizObj
*/
function _getGenotypeCPData(vizObj) {
    var cp_data = vizObj.data.cp_data,
        genotype_cp = {};

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
* function to, using the tree hierarchy, get the linear segments' starting key and length (including starting key)
* @param {Object} curNode -- current key in the tree
* @param {Object} chains -- originally empty object of the segments (key is segment start key, value is array of descendants in this chain)
* @param {Object} base -- the base key of this chain
*/
function _getLinearTreeSegments(curNode, chains, base) {

    // if it's a new base, create the base, with no descendants in its array yet
    if (base == "") {
        base = curNode.id;
        chains[base] = [];
    }
    // if it's a linear descendant, append the current key to the chain
    else {
        chains[base].push(curNode.id);
    }

    // if the current key has 1 child to search through
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
* @param {Object} chains -- the linear segments (chains) in the genotype tree (key is segment start key, value is array of descendants in this chain)
* @param {Object} curNode -- current key in the tree
* @param {Array} palette -- colour themes to choose from
* @param {Object} colour_assignment -- originally empty array of the final colour assignments
* @param {String} curTheme -- the colour theme currently in use
*/
function _colourTree(vizObj, chains, curNode, palette, colour_assignment, curTheme) {

    // colour node
    if (curNode.id == "Root") {
        colour_assignment[curNode.id] = vizObj.view.config.rootColour; // grey
        var n = chains[curNode.id].length+1; // + 1 to include the base key (this child)
        var tmp_palette = [];
        for (var j = 8; j >= 0; j -= Math.floor(9/n)) {
            tmp_palette.push(palette[curTheme][j])
        }
        palette[curTheme] = tmp_palette;
    }
    else {
        colour_assignment[curNode.id] = palette[curTheme].shift();
    }

    // if the current key has zero or >1 child to search through
    if (curNode.children.length != 1 && curNode.id != "Root") { 

        // remove its colour theme from the colour themes available
        delete palette[curTheme];
    }

    // if the current key has one child only
    if (curNode.children.length == 1) {

        // colour child with the same theme as its parent
        _colourTree(vizObj, chains, curNode.children[0], palette, colour_assignment, curTheme)
    }

    // otherwise
    else {
        // reorder the children according to their emergent cellular prevalence
        var tmpChildren = $.extend([], curNode.children);
        // tmpChildren.sort(function(a, b) {return vizObj.data.layoutOrder.indexOf(a.id) - vizObj.data.layoutOrder.indexOf(b.id)});
        
        // for each child
        for (var i = 0; i < tmpChildren.length; i++) {

            // give it a new colour theme
            curTheme = Object.keys(palette)[0];

            // modify the colour palette to contain the most contrasting colours
            var n = chains[tmpChildren[i].id].length+1; // + 1 to include the base key (this child)
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

/* function to get a colour palette
*/
function _getColourPalette() {

    var colours = {
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
* @param {Object} vizObj
*/
function _centreLine(vizObj) {
    var tsSVGWidth = vizObj.view.config.tsSVGWidth, // timesweep svg width
        tsSVGHeight = vizObj.view.config.tsSVGHeight; // timesweep svg height

    return "M 0 " + tsSVGHeight/2 + " L " + tsSVGWidth + " " + tsSVGHeight/2 + " L 0 " + tsSVGHeight/2;
}

/* tween function to transition to the next path ("path" in the data)
* @param {Object} vizObj
* @param {String} type - the type of transition ("move" or otherwise - if otherwise, will move to centre line)
* Note: situations other than "move" - could be an exit situation, where the next path is blank
*/
function _pathTween(vizObj, type) { 
    
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
        dest_path = (type == "move") ? this.__data__.path : _centreLine(vizObj); 
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

/*
* function to, using the order of genotype emergence and the tree hierarchy, get the vertical
* stacking order of the genotypes
* -- ensures that the *later* children emerge, the *closer* they are to their parent in the stack
* @param {Object} timesweep_data -- timesweep data
* @param {Array} emergence_values -- values of genotype emergence
* @param {Array} layoutOrder -- originally empty array of the final vertical stacking order
*/
function _vStackOrder(curNode, emergence_values, layoutOrder) {
    var child_emerg_vals = [], // emergence values of children
        sorted_children, // children sorted by their emergence values
        child_obj, // current child node
        sort_by_emerg = vizObj.view.config.sort_gtypes; // whether or not to vertically sort children by emergence values

    // add the current key id to the final vertical stacking order
    layoutOrder.push(curNode.id);

    // if the current key has children to search through
    if (curNode.children && curNode.children.length > 0) {

        // sort children by emergence
        if (sort_by_emerg) {

            // get emergence value of children
            for (i=0; i<curNode.children.length; i++) {
                var emerg_val = emergence_values[curNode.children[i].id];
                child_emerg_vals.push([curNode.children[i].id, emerg_val]);
            }
            sorted_children = _sort2DArrByValue(child_emerg_vals).reverse();

            // in the *reverse* order of emergence values, search children
            sorted_children.map(function(child) {
                child_obj = _.findWhere(curNode.children, {id: child});
                _vStackOrder(child_obj, emergence_values, layoutOrder);
            })
        }

        // children sorted by order in tree
        else {
            for (var i = 0; i < curNode.children.length; i++) {
                _vStackOrder(curNode.children[i], emergence_values, layoutOrder);
            }
        }
    } 

    return layoutOrder;
}

/* function to create a stack element (a genotype interval at a particular time point)
* @param {Object} layout -- layout of each genotype at each time point
* @param {String} tp -- time point of interest
* @param {String} gtype -- genotype of interest
* @param {Number} bottom_val -- value for the bottom of the interval
* @param {Number} top_val -- value for the top of the interval
* @param {String} state -- state of the genotype at this time point (e.g. "emerges", "present", "disappears")
*/
function _createStackElement(layout, tp, gtype, bottom_val, top_val, state) {
    // create the time point in the stack if it doesn't already exist
    layout[tp] = layout[tp] || {}; 

    // create the genotype in the stack
    layout[tp][gtype] = {
        "bottom": bottom_val,
        "top": top_val,
        "top_no_descendants": top_val, // the top of this genotype, without including its descendants
        "state": state
    };
}

/* function to get the layout of the timesweep, different depending on whether user wants centred
* or stacked view
* @param {Object} vizObj
* @param {Boolean} centred -- whether centred (T) or stacked (F) view desired
*/
function _getLayout(vizObj, centred) {

    // ------> CENTRED
    if (centred) {

        // get genotype layout order
        vizObj.data.layoutOrder = _getCentredLayoutOrder(vizObj, vizObj.data.treeStructure, []);

        // get layout of each genotype at each timepoint
        vizObj.data.layout = {};
        $.each(vizObj.data.timepoints, function(tp_idx, tp) { // for each time point
            _getCentredLayout(vizObj, vizObj.data.treeStructure, tp, vizObj.data.layout, 0);
        })
    }

    // ------> STACKED
    else {

        // traverse the tree to sort the genotypes into a final vertical stacking order (incorporating hierarchy)
        vizObj.data.layoutOrder = _vStackOrder(vizObj.data.treeStructure, vizObj.data.emergence_values, []);

        // get layout of each genotype at each timepoint
        vizObj.data.layout = _getStackedLayout(vizObj);
        // vizObj.data.layout = _getSpacedLayout(vizObj); // TODO testing spaced layout
    }
}

/* function to get genotype layout order for centred timesweep layout
* @param {Object} curNode -- current node in the tree
* @param {Array} layoutOrder -- originally empty array will be filled with the layout order of genotypes
*/
function _getCentredLayoutOrder(vizObj, curNode, layoutOrder) {
    var emergence_values = vizObj.data.emergence_values,
        child_emerg_vals = [], // emergence values of children
        sorted_children, // children sorted by their emergence values
        child_obj, // current child node 
        sort_by_emerg = vizObj.view.config.sort_gtypes; // whether or not to vertically sort children by emergence values

    layoutOrder.push(curNode.id);

    // vertically sort children by their emergence values
    if (sort_by_emerg) {
        // get emergence value of children
        for (i=0; i<curNode.children.length; i++) {
            var emerg_val = emergence_values[curNode.children[i].id];
            child_emerg_vals.push([curNode.children[i].id, emerg_val]);
        }
        sorted_children = _sort2DArrByValue(child_emerg_vals).reverse();

        // in the *reverse* order of emergence values, search children
        sorted_children.map(function(child) {
            child_obj = _.findWhere(curNode.children, {id: child});
            _getCentredLayoutOrder(vizObj, child_obj, layoutOrder);
        })
    }

    // sort children by order in tree
    else {
        for (var i = 0; i < curNode.children.length; i++) {
            _getCentredLayoutOrder(vizObj, curNode.children[i], layoutOrder, sort_by_emerg);
        }
    }

    return layoutOrder;
}

/* function to get cellular prevalences for each genotype in a stack, one stack for each time point
* @param {Object} vizObj
*/
function _getStackedLayout(vizObj) {
    var layout = {},
        cp_data = vizObj.data.cp_data,
        timepoints = vizObj.data.timepoints,
        layoutOrder = vizObj.data.layoutOrder,
        replaced_gtypes = {},
        curDescendants,
        gTypeAndDescendants, // genotype and descendants
        curAncestors, // all ancestors of current genotype
        gTypes_curTP, // genotypes with cp data at the CURRENT time point
        gTypes_nextTP, // genotypes with cp data at the NEXT time point
        width, // the cp as the width to add for this genotype at this timepoint
        midpoint, // midpoint for emergence
        ancestor_midpoint; // ancestor's midpoint for emergence

    // for each timepoint (in order)...
    $.each(timepoints, function(tp_idx, tp) { 

        layout[tp] = layout[tp] || {}; // stack for this time point (may already be created if disappearance occurs at this time point)
        var cp = cp_data[tp], // cellular prevalence data for this time point
            sHeight = 0, // current height of the stack
            prev_tp = timepoints[tp_idx-1],
            next_tp = timepoints[tp_idx+1];

        // ... for each genotype ...
        $.each(layoutOrder, function(gtype_idx, gtype) { 
            curDescendants = vizObj.data.treeDescendantsArr[gtype];
            gTypeAndDescendants = ($.extend([], curDescendants)); 
            gTypeAndDescendants.push(gtype); 
            curAncestors = vizObj.data.treeAncestorsArr[gtype]; 
            gTypes_curTP = Object.keys(cp_data[tp]); 
            gTypes_nextTP = (cp_data[next_tp]) ? Object.keys(cp_data[next_tp]) : undefined; 
            width = (cp[gtype]) ? cp[gtype] : 0; 


            // if this genotype or any descendants EMERGE at this time point
            if ((_getIntersection(gTypeAndDescendants, gTypes_curTP).length == 0) &&
                (gTypes_nextTP && _getIntersection(gTypeAndDescendants, gTypes_nextTP).length > 0)) {

                // create the stack element as emerging
                _createStackElement(layout, tp, gtype, 0, 0, "emerges");

            }

            // if this genotype is REPLACED by any descendant at this time point
            else if (!cp_data[tp][gtype] && (_getIntersection(curDescendants, gTypes_curTP).length > 0) && gtype != "Root") {
                _createStackElement(layout, tp, gtype, sHeight, sHeight, "replaced");
                replaced_gtypes[gtype] = replaced_gtypes[gtype] || [];
                replaced_gtypes[gtype].push(tp);
            }

            // if this genotype existed at the previous time point, 
            // but neither it nor its descendants are present at this time point (they DISAPPEAR)
            else if (cp_data[prev_tp] && cp_data[prev_tp][gtype] && !cp_data[tp][gtype] && _getIntersection(gTypeAndDescendants, gTypes_curTP).length == 0) {
                _createStackElement(layout, tp, gtype, sHeight, sHeight, "disappears_stretched");
            }

            // if this genotype or any descendants EXIST at this time point
            else if (_getIntersection(gTypeAndDescendants, gTypes_curTP).length > 0) {
                var n_desc_present = _getIntersection(curDescendants, gTypes_curTP).length;

                // in case of reemergence, remove it from the "replaced genotypes" object
                delete replaced_gtypes[gtype]; 

                // create it as present
                _createStackElement(layout, tp, gtype, sHeight, sHeight + width, "present");
                midpoint = (layout[tp][gtype]["bottom"] + layout[tp][gtype]["top"])/2;

                // update stack height
                sHeight = layout[tp][gtype]["top"];

                // if it EMERGED at the previous time point
                if (cp_data[prev_tp] && layout[prev_tp][gtype] && layout[prev_tp][gtype]["state"] == "emerges") {

                    // update its emergence y-value
                    _createStackElement(layout, prev_tp, gtype, midpoint, midpoint, "emerges");
                }

                // update ancestors to incorporate the current genotype's stack interval
                for (var i = 0; i < curAncestors.length; i++) {

                    // if the ancestor has not been replaced by its descendants
                    if (layout[tp][curAncestors[i]] && 
                        (!replaced_gtypes[curAncestors[i]] || // (either not in replaced list ...
                        (replaced_gtypes[curAncestors[i]].length == 1))) {  // ... or has just been replaced at current time point)

                        // update PRESENCE in this time point (increase "top" value)
                        layout[tp][curAncestors[i]]["top"] += width;
                        ancestor_midpoint = (layout[tp][curAncestors[i]]["top"] + layout[tp][curAncestors[i]]["bottom"])/2;

                        // update EMERGENCE y-coordinate in previous time point 
                        if (cp_data[prev_tp] && layout[prev_tp][curAncestors[i]] && layout[prev_tp][curAncestors[i]]["state"] == "emerges") {
                            _createStackElement(layout, prev_tp, curAncestors[i], ancestor_midpoint, ancestor_midpoint, "emerges");
                        }
                    }
                }
            }
        })
    })

    return layout;
}

/* function to get cellular prevalences for each genotype in a *spaced* stack, one stack for each time point
* @param {Object} vizObj
*/
function _getSpacedLayout(vizObj) {
    var layout = {},
        cp_data = vizObj.data.cp_data,
        timepoints = vizObj.data.timepoints,
        layoutOrder = vizObj.data.layoutOrder,
        replaced_gtypes = {},
        curDescendants,
        gTypeAndDescendants, // genotype and descendants
        curAncestors, // all ancestors of current genotype
        gTypes_curTP, // genotypes with cp data at the CURRENT time point
        gTypes_nextTP, // genotypes with cp data at the NEXT time point
        width, // the cp as the width to add for this genotype at this timepoint
        midpoint, // midpoint for emergence
        ancestor_midpoint, // ancestor's midpoint for emergence
        direct_ancestors = vizObj.data.direct_ancestors, // direct ancestor for each genotype
        direct_descendants = vizObj.data.direct_descendants, // direct descendant for each genotype
        space = 8/vizObj.view.config.height; // space between genotypes (in pixels) 

    // GET STACKED LAYOUT

    // for each timepoint (in order)...
    $.each(timepoints, function(tp_idx, tp) { 

        layout[tp] = layout[tp] || {}; // stack for this time point (may already be created if disappearance occurs at this time point)
        var cp = cp_data[tp], // cellular prevalence data for this time point
            sHeight = 0, // current height of the stack
            prev_tp = timepoints[tp_idx-1],
            next_tp = timepoints[tp_idx+1];

        // ... for each genotype ...
        $.each(layoutOrder, function(gtype_idx, gtype) { 
            curDescendants = vizObj.data.treeDescendantsArr[gtype];
            gTypeAndDescendants = ($.extend([], curDescendants)); 
            gTypeAndDescendants.push(gtype); 
            curAncestors = vizObj.data.treeAncestorsArr[gtype]; 
            gTypes_curTP = Object.keys(cp_data[tp]); 
            gTypes_nextTP = (cp_data[next_tp]) ? Object.keys(cp_data[next_tp]) : undefined; 
            width = (cp[gtype]) ? cp[gtype] : 0; 


            // if this genotype or any descendants EMERGE at this time point
            if ((_getIntersection(gTypeAndDescendants, gTypes_curTP).length == 0) &&
                (gTypes_nextTP && _getIntersection(gTypeAndDescendants, gTypes_nextTP).length > 0)) {

                // create the stack element as emerging
                _createStackElement(layout, tp, gtype, 0, 0, "emerges");

            }

            // if this genotype is REPLACED by any descendant at this time point
            else if (!cp_data[tp][gtype] && (_getIntersection(curDescendants, gTypes_curTP).length > 0) && gtype != "Root") {
                _createStackElement(layout, tp, gtype, sHeight, sHeight, "replaced");
                replaced_gtypes[gtype] = replaced_gtypes[gtype] || [];
                replaced_gtypes[gtype].push(tp);
            }

            // if neither this genotype nor any descendants are present at this time point (they DISAPPEAR)
            else if (!cp_data[tp][gtype] && _getIntersection(gTypeAndDescendants, gTypes_curTP).length == 0) {
                _createStackElement(layout, tp, gtype, sHeight, sHeight, "disappears_stretched");
            }

            // if this genotype or any descendants EXIST at this time point
            else if (_getIntersection(gTypeAndDescendants, gTypes_curTP).length > 0) {

                // in case of reemergence, remove it from the "replaced genotypes" object
                delete replaced_gtypes[gtype]; 

                // create it as present
                _createStackElement(layout, tp, gtype, sHeight, sHeight + width, "present");
                midpoint = (layout[tp][gtype]["bottom"] + layout[tp][gtype]["top"])/2;

                // update stack height
                sHeight = layout[tp][gtype]["top"];

                // if it EMERGED at the previous time point
                if (cp_data[prev_tp] && layout[prev_tp][gtype] && layout[prev_tp][gtype]["state"] == "emerges") {

                    // update its emergence y-value
                    _createStackElement(layout, prev_tp, gtype, midpoint, midpoint, "emerges");
                }

                // update ancestors to incorporate the current genotype's stack interval
                for (var i = 0; i < curAncestors.length; i++) {

                    // if the ancestor has not been replaced by its descendants
                    if (layout[tp][curAncestors[i]] && 
                        (!replaced_gtypes[curAncestors[i]] || // (either not in replaced list ...
                        (replaced_gtypes[curAncestors[i]].length == 1))) {  // ... or has just been replaced at current time point)

                        // update PRESENCE in this time point (increase "top" value)
                        layout[tp][curAncestors[i]]["top"] += width;
                        ancestor_midpoint = (layout[tp][curAncestors[i]]["top"] + layout[tp][curAncestors[i]]["bottom"])/2;

                        // update EMERGENCE y-coordinate in previous time point 
                        if (cp_data[prev_tp] && layout[prev_tp][curAncestors[i]] && layout[prev_tp][curAncestors[i]]["state"] == "emerges") {
                            _createStackElement(layout, prev_tp, curAncestors[i], ancestor_midpoint, ancestor_midpoint, "emerges");
                        }
                    }
                }
            }
        })
    })

    // SPACE THE STACKED LAYOUT

    // for each timepoint (in order)...
    $.each(timepoints, function(tp_idx, tp) { 

        var seenGTypes = [];
        prev_tp = timepoints[tp_idx-1];

        // ... for each genotype ...
        $.each(layoutOrder, function(gtype_idx, gtype) {

            if (seenGTypes.indexOf(gtype) == -1 && gtype != "Root") {

                gTypes_curTP = Object.keys(cp_data[tp]);
                var cur_ancestor = direct_ancestors[gtype];
                var cur_ancestor_cp = cp_data[tp][cur_ancestor] || 0;
                var existing_siblings = _getIntersection(direct_descendants[cur_ancestor], gTypes_curTP);
                var cur_space = ((existing_siblings.length+1) * space < cur_ancestor_cp) ? 
                    space : 
                    cur_ancestor_cp/(existing_siblings.length+1);

                // function to sort children by layout order
                function sortingFunc(a, b) {
                  var sortingArr = layoutOrder;
                  return sortingArr.indexOf(a.id) - sortingArr.indexOf(b.id);
                }
                var sorted_siblings = existing_siblings.sort(sortingFunc);

                sHeight = layout[tp][cur_ancestor]["top"];
                
                // for each sibling
                for (var i = 0; i < sorted_siblings.length; i++) {

                    var cur_width = layout[tp][sorted_siblings[i]]["top"] - layout[tp][sorted_siblings[i]]["bottom"];

                    // if this sibling emerges at the previous time point
                    if (cp_data[prev_tp] && layout[prev_tp][sorted_siblings[i]] && layout[prev_tp][sorted_siblings[i]]["state"] == "emerges") {
                        
                        layout[tp][sorted_siblings[i]]["top"] = sHeight - (i+1)*cur_space;
                        layout[tp][sorted_siblings[i]]["bottom"] = sHeight - cur_width - (i+1)*cur_space;
                        midpoint = (layout[tp][sorted_siblings[i]]["top"] + layout[tp][sorted_siblings[i]]["bottom"])/2;

                        // update EMERGENCE y-coordinate in previous time point 
                        if (cp_data[prev_tp] && layout[prev_tp][sorted_siblings[i]] && layout[prev_tp][sorted_siblings[i]]["state"] == "emerges") {
                            _createStackElement(layout, prev_tp, sorted_siblings[i], midpoint, midpoint, "emerges");
                        }
                    }

                    sHeight -= cur_width;
                }
            }
        })
    })



    return layout;
}
/* function to get cellular prevalence labels for each genotype at each time point, for traditional timesweep view
* @param {Object} vizObj
*/
function _getTraditionalCPLabels(vizObj) {
    var dim = vizObj.view.config,
        layout = vizObj.data.layout,
        labels = [], // array of labels
        data, // data for a genotype at a time point
        label, // current label to add
        curDescendants,
        gTypes_curTP; 

    // for each time point
    Object.keys(layout).forEach(function(tp, tp_idx) {
        if (tp != "T0") {

            // for each genotype
            Object.keys(layout[tp]).forEach(function(gtype, gtype_idx) {
                curDescendants = vizObj.data.treeDescendantsArr[gtype];
                // var immediateDescendants = _.pluck(vizObj.data.)
                gTypes_curTP = Object.keys(vizObj.data.cp_data[tp]); 

                // data for this genotype at this time point
                data = layout[tp][gtype];

                // if the genotype exists at this time point (isn't emerging or disappearing / replaced)
                if ((data.bottom != data.top_no_descendants) && gtype != "Root") {

                    var nDesc = _getIntersection(curDescendants, gTypes_curTP).length;

                    // add its information 
                    label = {};

                    if (dim.centredView) { // centred view
                        label['tp'] = tp;
                        label['gtype'] = gtype;
                        label['cp'] = data.cp;
                        label['middle'] = data.top - (data.cp/(2*(data.nChildren+1)));
                        label['type'] = "traditional";
                    }
                    else { // stacked view
                        label['tp'] = tp;
                        label['gtype'] = gtype;
                        label['cp'] = data.top_no_descendants-data.bottom;
                        label['middle'] = (data.top_no_descendants + data.bottom)/2;
                        label['type'] = "traditional";
                    }
                    
                    labels.push(label);

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
    var separate_paths = vizObj.data.separate_paths,
        labels = [],
        label,
        gtype,
        midpoint,
        path,
        cp, // cellular prevalence
        tp; // time point

    // for each genotype
    for (var i = 0; i < separate_paths.length; i++) {
        gtype = separate_paths[i]["gtype"];
        midpoint = separate_paths[i]["midpoint"];
        path = separate_paths[i]["path"];

        // for each point in the path
        for (var j = 0; j < path.length; j++) {
            cp = path[j]["cp"];
            tp = path[j]["tp"];

            if (tp != "T0") {

                // if the genotype exists at this time point (isn't emerging or disappearing / replaced)
                if (cp) {
                    label = {};
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
* @param {Object} layout -- for each time point, the interval boundaries for each genotype at that time point
* @param {Object} treeAncestorsArr -- for each genotype (properties), an array of their ancestors (values)
* @param {String} gtype -- the genotype of interest
* @param {String} tp -- the time point of interest
*/
function _findEmergentAncestors(layout, treeAncestorsArr, gtype, tp) {
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

/* function to shift the emergence in the x-direction if multiple genotypes from the same lineage emerge at the same timepoint
* @param {Object} vizObj
*/
function _shiftEmergence(vizObj) {
    var dim = vizObj.view.config,
        layout = vizObj.data.layout,
        layoutOrder = vizObj.data.layoutOrder,
        timepoints = vizObj.data.timepoints,
        treeAncestorsArr = vizObj.data.treeAncestorsArr,
        treeDescendantsArr = vizObj.data.treeDescendantsArr,
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
                ancestors = _findEmergentAncestors(layout, treeAncestorsArr, gtype, tp);
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
            
            // if this genotype has not already been x-shifted and emerges at this time point
            if ((genotypes_xshifted.indexOf(gtype) == -1) && layout[tp][gtype] && (layout[tp][gtype]["state"] == "emerges")) {

                // get the ancestors that also emerge at this time point
                ancestors = _findEmergentAncestors(layout, treeAncestorsArr, gtype, tp);

                // x-shift and x-partition for the current genotype (depends on how many of its ancestors emerge)
                layout[tp][gtype]["xShift"] = (ancestors.length+1) / nPartitions;
                layout[tp][gtype]["nPartitions"] = nPartitions;

                genotypes_xshifted.push(gtype);

                // for each ancestor that also emerged at this time point
                for (var i = 0; i < ancestors.length; i++) {

                    // find the ancestor's ancestors that also emerge at this time point
                    ancestors_of_ancestor = _findEmergentAncestors(layout, treeAncestorsArr, ancestors[i], tp);
                    
                    // x-shift and x-partition for the current ancestor (depends on how many of its ancestors emerge)
                    layout[tp][ancestors[i]]["xShift"] = (ancestors_of_ancestor.length+1) / nPartitions;
                    layout[tp][ancestors[i]]["nPartitions"] = nPartitions;

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
    var dim = vizObj.view.config,
        layout = vizObj.data.layout,
        timepoints = vizObj.data.timepoints,
        timepoints_rev = ($.extend([], timepoints)).reverse(),
        mid_tp = (1/((timepoints.length-1)*2)), // half of x-distance between time points
        layoutOrder = vizObj.data.layoutOrder,
        paths = [],
        cur_path,
        emerges, // whether or not a genotype emerges at a time point
        xShift, // the amount of shift in the x-direction for a genotype (when it's emerging)
        nPartitions, // number of partitions between two time points 
        next_tp, 
        xBottom, // x-value at the bottom of the genotype sweep at a time point
        xTop, // x-value at the top of the genotype sweep at a time point
        y_mid, // y proportion as halfway between this and the next time point
        appear_xBottom,
        appear_xTop,
        event_occurs, // whether or not an event occurs after a time point
        event_index, // index of the current event 
        perturbations = vizObj.data.perturbations, // user specified perturbations in the time-series data
        frac; // fraction of total tumour content remaining at the perturbation event;

    $.each(layoutOrder, function(gtype_idx, gtype) {
        
        // path for the current genotype
        cur_path = {"gtype": gtype, "path":[]};
        
        // for each time point (in sequence)...
        $.each(timepoints, function(idx, tp) {
            
            // whether or not an event occurs after this timepoint
            event_occurs = (_getIntersection(_.pluck(perturbations, "prev_tp"), tp).length > 0 
                && gtype != "Root");
            event_index = _.pluck(perturbations, "prev_tp").indexOf(tp);

            // if the genotype exists or emerges/disappears at this time point
            if (layout[tp][gtype]) {
                emerges = (layout[tp][gtype]["state"] == "emerges");
                nPartitions = (event_occurs) ?
                    layout[tp][gtype]["nPartitions"]*2 :
                    layout[tp][gtype]["nPartitions"];
                next_tp = timepoints[idx+1];
                xShift = 
                    (event_occurs) ? 
                    0.5 + (layout[tp][gtype]["xShift"]/2) : 
                    layout[tp][gtype]["xShift"];

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
                }

                            
            }
        })

        // for each time point (in *reverse* sequence)...
        $.each(timepoints_rev, function(idx, tp) {

            // whether or not an event occurs after this timepoint
            event_occurs = (_getIntersection(_.pluck(perturbations, "prev_tp"), tp).length > 0 
                && gtype != "Root");
            event_index = _.pluck(perturbations, "prev_tp").indexOf(tp);

            // if the genotype exists or emerges/disappears at this time point
            if (layout[tp][gtype]) {
                emerges = (layout[tp][gtype]["state"] == "emerges");
                nPartitions = (event_occurs) ?
                    layout[tp][gtype]["nPartitions"]*2 :
                    layout[tp][gtype]["nPartitions"];
                next_tp = timepoints_rev[idx-1];
                xShift = 
                    (event_occurs) ? 
                    0.5 + layout[tp][gtype]["xShift"]/2 : 
                    layout[tp][gtype]["xShift"];

                // get the x-coordinate for the top of this genotype's interval 
                xTop = (emerges) ? 
                    ((timepoints.length-1) - idx + xShift)/(timepoints.length-1) : 
                    ((timepoints.length-1) - idx)/(timepoints.length-1);

                // if the current genotype ...
                // ... EMERGES at the current time point...
                if (emerges) {
                    // add a path point to bring forward the sweep such that its descendants can be contained within it
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

/* function to convert genotype stacks at each time point into a list of moves for each genotype's d3 path object (separate paths timesweep view)
* Note: the appearance timepoint is the time at which the genotype appears in the dataset
*       the emergence timepoint is the time at which the genotype must have emerged (appearance timepoint - 1)
* @param {Object} vizObj
*/
function _getSeparatePaths(vizObj) {
    var dim = vizObj.view.config,
        timepoints = vizObj.data.timepoints,
        timepoints_rev = ($.extend([], timepoints)).reverse(),
        layoutOrder = vizObj.data.layoutOrder,
        genotype_cp = vizObj.data.genotype_cp,
        layout = vizObj.data.layout,
        padding = 0.03,
        ts_sep_labels = vizObj.data.ts_sep_labels,
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
        if (gtype != "Root") {
            var cps = Object.keys(genotype_cp[gtype]).map(function (key) { return genotype_cp[gtype][key]; });
            largest_cps[gtype] = Math.max(...cps);
        }
    })
    denominator = Object.keys(largest_cps).map(function (key) { return largest_cps[key]; }).reduce(function(a, b) {
        return a + b;
    }); 
    full_padding = padding * (Object.keys(largest_cps).length+1); // one padding between each genotype (including one above, one below)
    denominator += full_padding;

    // for each genotype, get its path through the time points
    $.each(layoutOrder, function(gtype_idx, gtype) {

        if (Object.keys(largest_cps).indexOf(gtype) != -1) {

            // scaled midpoint for this genotype's timesweep band
            scaled_midpoint = (largest_cps[gtype] / denominator)/2 + sHeight;
            scaled_midpoint += ((seenGTypes.length)/(Object.keys(largest_cps).length+1)) * full_padding/denominator; // padding

            // path for the current genotype
            cur_path = {"gtype": gtype, "midpoint": scaled_midpoint, "path":[]};
            
            // BOTTOM COORDINATE for each time point 
            $.each(timepoints, function(tp_idx, tp) {

                // xShift info
                entry_exit_options = ["disappears_stretched", "emerges", "replaced"];
                entry_exit = (layout[tp][gtype]) ? (entry_exit_options.indexOf(layout[tp][gtype]["state"]) != -1) : false;
                xShift = (layout[tp][gtype] && layout[tp][gtype]["xShift"]) ? layout[tp][gtype]["xShift"] : 0;

                if (entry_exit || genotype_cp[gtype][tp]) {
                    // add this genotype to the seen genotypes
                    if (seenGTypes.indexOf(gtype) == -1) {
                        seenGTypes.push(gtype);
                    }

                    // add the path point
                    x = (tp_idx + xShift)/(timepoints.length-1);
                    y = genotype_cp[gtype][tp] ? scaled_midpoint - (genotype_cp[gtype][tp] / denominator)/2 : scaled_midpoint;
                    cur_path["path"].push({ "x": x, "y": y, "tp": tp, "cp": genotype_cp[gtype][tp]});
                }
            });

            // TOP COORDINATE for each time point (in *reverse* sequence)...
            $.each(timepoints_rev, function(tp_idx, tp) {

                // xShift info
                entry_exit_options = ["disappears_stretched", "emerges", "replaced"];
                entry_exit = (layout[tp][gtype]) ? (entry_exit_options.indexOf(layout[tp][gtype]["state"]) != -1) : false;
                xShift = (layout[tp][gtype] && layout[tp][gtype]["xShift"]) ? layout[tp][gtype]["xShift"] : 0;

                // add the path point
                if (entry_exit || genotype_cp[gtype][tp]) {
                    x = ((timepoints.length-1) - tp_idx + xShift)/(timepoints.length-1);
                    y = genotype_cp[gtype][tp] ? scaled_midpoint + (genotype_cp[gtype][tp] / denominator)/2 : scaled_midpoint;
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
            ysource = (1-path[i].y) * tsSVGHeight;
            ytarget = (1-path[i+1].y) * tsSVGHeight;

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

/* function to sort a 2D array by the second value in each contained array, 
* @returns the sorted first elements of each contained array 
*/
function _sort2DArrByValue(obj)
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

// Check color brightness
// returns brightness value from 0 to 255
// http://www.webmasterworld.com/forum88/9769.htm
function _get_brightness(hexCode) {
    // strip off any leading #
    hexCode = hexCode.replace('#', '');

    var c_r = parseInt(hexCode.substr(0, 2),16);
    var c_g = parseInt(hexCode.substr(2, 2),16);
    var c_b = parseInt(hexCode.substr(4, 2),16);

    return ((c_r * 299) + (c_g * 587) + (c_b * 114)) / 1000;
}


// convert RGB to hex
// http://stackoverflow.com/questions/1740700/get-hex-value-rather-than-rgb-value-using-jquery
function _rgb2hex(rgb) {
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
function _increase_brightness(hex, percent){
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
function _decrease_brightness(hex, percent){
    var r = parseInt(hex.substr(1, 2), 16),
        g = parseInt(hex.substr(3, 2), 16),
        b = parseInt(hex.substr(5, 2), 16);

   return '#' +
       ((0|(1<<8) + r * (100 - percent) / 100).toString(16)).substr(1) +
       ((0|(1<<8) + g * (100 - percent) / 100).toString(16)).substr(1) +
       ((0|(1<<8) + b * (100 - percent) / 100).toString(16)).substr(1);
}