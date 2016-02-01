#' Timesweeps
#'
#' \code{timesweep} generates patient clonal timesweeps.
#'
#' @param patient Patient name.
#' @param clonal.prev.csv Path to clonal prevalence csv file.
#' @param tree.gml Path to GML file.
#' @param node.col Named character vector with the keys as node labels and 
#'   values as colors.
#' @param xaxis.title x-axis title. 
#' @param yaxis.title y-axis title.
#' @param alpha Alpha value for sweeps
#' @param genotype.position How to position the genotypes from ["centre", "stack", "space"] 
#'   "centre" -- genotypes are centred with respect to their ancestors
#'   "stack" -- genotypes are stacked such that no genotype is split at any time point
#'   "space" -- genotypes are stacked but with a bit of spacing at the top (emergence is clearer)
#' @param show.root Whether or not to show the root in the timesweep view
#' @param perturbations Data frame of any perturbations that occurred between two time points, 
#'   and the fraction of total tumour content left.
#'   Format: data.frame(perturbation = c("chemo"), prev_tp = c("T1"), next_tp = c("T2"), frac = c(0.2))
#' @param sort Whether (T) or not (F) to vertically sort the genotypes by their emergence values
#' @param width Width of the plot. 
#' @param height Height of the plot.
#' @export
#' @examples
#' library("timesweep")
#' timesweep("SAMPLE_PATIENT", system.file("extdata", "clonal_dynamics.csv", package = "timesweep"), 
#'            system.file("extdata", "tree.gml", package = "timesweep"))
timesweep <- function(patient, clonal.prev.csv, tree.gml, node.col, xaxis.title, yaxis.title, alpha, 
                      genotype.position, show.root, perturbations, sort, width = NULL, height = NULL) {

  # parse csv
  clonal.prev.data = read.csv(clonal.prev.csv)
  clonal.prev.JSON <- jsonlite::toJSON(clonal.prev.data)
  gmlString <- paste(readLines(tree.gml), collapse=" ")

  if (missing(node.col)) {
    node.col.JSON <- "NA"
  } else {
    node.col.JSON <- jsonlite::toJSON(data.frame(node_label = names(node.col),
                                                 col = node.col)) 
  }

  if (missing(xaxis.title)) {
    xaxis.title <- "NA"
  } 

  if (missing(yaxis.title)) {
    yaxis.title <- "NA"
  } 

  if (missing(alpha)) {
    alpha <- 30
  } 

  if (missing(genotype.position)) {
    genotype.position <- "stack"
  }

  if (missing(show.root) || show.root) {
    show.root <- "T"
  }
  else {
    show.root <- "F"
  }

  if (missing(perturbations)) {
    perturbations_JSON <- "NA"
  }
  else {
    perturbations_JSON <- jsonlite::toJSON(perturbations)
  }

  if (missing(sort) || sort) {
    sort <- "T"
  }
  else {
    sort <- "F"
  }



  # forward options using x
  x = list(
    patient = patient,
    clonal_prev_JSON = clonal.prev.JSON,
    tree_gml = gmlString,
    node_col_JSON = node.col.JSON,
    xaxis_title = xaxis.title,
    yaxis_title = yaxis.title,
    alpha = alpha,
    gtype_position = genotype.position,
    show_root = show.root,
    perturbations_JSON = perturbations_JSON,
    sort = sort
  )

  # create widget
  htmlwidgets::createWidget(
    name = "timesweep",
    x,
    width = width,
    height = height,
    package = "timesweep"
  )
}

#' Widget output function for use in Shiny
#'
#' @export
timesweepOutput <- function(outputId, width = "100%", height = "400px"){
  htmlwidgets::shinyWidgetOutput(outputId, "timesweep", width, height, 
                                 package = "timesweep")
}

#' Widget render function for use in Shiny
#'
#' @export
renderTimesweep <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) } # force quoted
  htmlwidgets::shinyRenderWidget(expr, timesweepOutput, env, quoted = TRUE)
}
