// MUTATION TABLE FUNCTIONS

/* function to make mutation table
* @param {Object} curVizObj -- vizObj for the current view
* @param {Object} mutationTableDIV -- DIV for mutation table
* @param {Array} data -- data to plot within table
* @param {Number} table_height -- height of the table (in px)
*/
function _makeMutationTable(curVizObj, mutationTableDIV, data, table_height) {
	var dim = curVizObj.generalConfig,
		view_id = curVizObj.view_id,
		table;

	// make deferred object for mutation table setup
	curVizObj.mutTableDef = new $.Deferred();

    // create table skeleton
  	mutationTableDIV.append("table")
  		.attr("class", "display compact")
    	.attr("id", function() { return view_id + "_mutationTable"; });

    // create data table
	$(document).ready(function() {
	    table = $("#" + view_id + "_mutationTable").DataTable({
	      	"data": data,
	      	"columns": dim.mutationColumns,
		    "scrollY":        table_height - 50, // - 50 for search bar, etc.
	        "scrollCollapse": true,
	        "paging":         false,
	        "info": 		  false,
       		"aaSorting": [] // disable initial sort
	    });

	    curVizObj.mutTableDef.resolve("Finished creating table setup.");
	});	

	// when mutation table is set up
	curVizObj.mutTableDef.done(function() {

		// d3 effects
		$("#" + view_id + "_mutationTable")
	        .on('click', 'tr', function () { 
	        	
	        	// hide VAF tooltips
	        	curVizObj.tips.forEach(function(curTip) {
	        		curTip.hide();
	        	})

	        	// if mutation is already selected, 
	        	if ($(this).hasClass("selected")) {
	        		// switch mutation selection to false
	        		dim.mutSelectOn = false;
	        	}
	        	// otherwise, 
	        	else {
	        		// switch on mutation selection
	        		dim.mutSelectOn = true;
	        	}

	        	// MUTATION SELECTED

	        	if (dim.mutSelectOn) {

		        	// data for the row on mouseover
		        	var cur_data = table.rows(this).data()[0];
		        	if (!dim.selectOn) {

		        		// if a different row was previously selected
		        		if (d3.select("#" + curVizObj.view_id).selectAll(".selected")[0].length == 1) {

		        			// deselect that row
			        		d3.select("#" + curVizObj.view_id).select(".selected").classed("selected", false);

			        		// remove all mutation prevalences information from view
    						d3.select("#" + curVizObj.view_id).selectAll(".mutationPrev").remove();

    						// unhighlight (red) the previous link
    						d3.select("#" + view_id).selectAll(".legendTreeLink").attr("stroke", dim.treeLinkColour);
			        	}

		        		// shade main view & legend 
	                    _shadeTimeSweep(curVizObj);
                    	_shadeLegend(curVizObj);

                    	// highlight this link 
	                    d3.select("#" + view_id)
	                        .select(".legendTreeLink." + cur_data.link_id)
	                        .attr("stroke", "red");

	                    // highlight all elements downstream of link 
	                    _propagatedEffects(curVizObj, cur_data.link_id, curVizObj.link_ids, "downstream");

		        		// mark as selected
	        			$(this).addClass('selected');

                        // if mutation prevalences exist, show them for this mutation
                        if (curVizObj.userConfig.mutation_prevalences) {
                        	// genomic location of mutation
                            var location = cur_data.chrom + ":" + cur_data.coord; 

                            // prevalences of this mutation at each sample
                            var cur_prevs = curVizObj.userConfig.mutation_prevalences[location]; 

                            // threshold for mutation prevalence
                            var threshold = 0.01;

                            // filter mutations (get rid of those < threshold)
                            var cur_prevs_filtered = _.filter(cur_prevs, function(VAF) { 
                            	return VAF.VAF >= threshold; 
                            });

		        			// for each prevalence
		        			cur_prevs_filtered.forEach(function(prev) {

							    // tooltip for mutation VAFs
							    var curTip = d3.tip()
							        .attr('class', 'd3-tip')
							        .offset([-10,0])
							        .html(function(d) {
							    		return "<span>" + d + "</span>";
							  		})	

							  	// add to list of tips
							  	curVizObj.tips.push(curTip);

							  	// invoke the tip in the context of this visualization
							  	d3.select("#" + view_id).select(".timesweep_" + view_id).call(curTip);

							  	// show tooltip
							  	var rounded_VAF = (Math.round(prev.VAF*100)/100).toFixed(2);
							  	curTip.show(rounded_VAF, 
							  		d3.select("#" + view_id).select(".xAxisLabels.tp_" + prev.timepoint)[0][0]);
		        			})
                        }
		            }        		
	        	}

	        	// MUTATION DE-SELECTED (click anywhere in table)

	        	else {
	        		_backgroundClick(curVizObj);
	        	}

	        });


		// add clone SVGs
		dim.curCloneIDs = _.pluck(data, "clone_id");
		_addCloneSVGsToTable(curVizObj, dim.curCloneIDs);
    })
}

/* function to add clone SVGs to the mutation table
* @param {Object} curVizObj -- vizObj for the current view
* @param {Array} clone_ids -- clone ids to plot within table
*/
function _addCloneSVGsToTable(curVizObj, clone_ids) {
	// remove any previous clone SVGs
	d3.select("#" + curVizObj.view_id).selectAll(".svgCloneCircle").remove();

	// get clone column number
	var mut_columns = _.pluck(curVizObj.generalConfig.mutationColumns, "data");
	var clone_column_no = mut_columns.indexOf("empty") + 1;

	// add clone SVGs
	var rows = d3.select("#" + curVizObj.view_id + "_mutationTable").selectAll("tr");
	var svgColumn = rows.selectAll("td:nth-child(" + clone_column_no + ")")
		.append("div")
		.attr("id", "svgCloneCircleDIV")
		.style("height","100%")
        .style("width","100%"); 
    var index = 0; // index of clone id in clone_ids array
    var svgCircle = svgColumn
        .append("svg")
        .attr("width", 10)
        .attr("height", 10)
        .attr("class","svgCloneCircle")
        .append("circle")
        .attr("cx", 5)
        .attr("cy", 5)
        .attr("r", 4)
        .attr("fill", function() {
        	return curVizObj.view.alpha_colour_assignment[clone_ids[index++]];
        })
        .attr("stroke", function() {
        	// fill happens first for all rows, so we have to reset the index to zero
        	// before setting the stroke for all rows
        	if (index == clone_ids.length) {
        		index = 0;
        	}
        	return curVizObj.view.colour_assignment[clone_ids[index++]];
        });
}