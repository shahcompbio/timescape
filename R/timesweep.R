#' Timesweeps
#'
#' \code{timesweep} generates patient clonal timesweeps.
#'
#' @param patient Patient name.
#' @param clonal.prev.csv Path to clonal prevalence csv file.
#' @param tree.gml Path to GML file.
#' @param node.col Data frame with node labels and colours 
#'   Format: columns are (1) {String} the node labels
#'                       (2) {String} the corresponding colour for each node label
#'   E.g.: data.frame(node_label = c("1","2","3","4","5"), 
#'                    col = c("F8766D66", "A3A50066", "00BF7D66", "00B0F666", "E76BF366"))
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
#'   Format: columns are (1) {String} the perturbation name
#'                       (2) {String} the time point (as labelled in cellular prevalence data) BEFORE perturbation
#'                       (3) {String} the time point (as labelled in cellular prevalence data) AFTER perturbation
#'                       (4) {Number} the fraction of total tumour content remaining at the time of perturbation.", sep=""))
#'   E.g.: data.frame(perturbation = c("chemo"), 
#'                    prev_tp = c("T1"),
#'                    next_tp = c("T2"), 
#'                    frac = c(0.2))
#' @param sort Whether (T) or not (F) to vertically sort the genotypes by their emergence values
#' @param width Width of the plot. 
#' @param height Height of the plot.
#' @export
#' @examples
#' library("timesweep")
#' timesweep("SAMPLE_PATIENT", system.file("extdata", "clonal_dynamics.csv", package = "timesweep"), 
#'            system.file("extdata", "tree.gml", package = "timesweep"))
timesweep <- function(patient, 
                      clonal.prev.csv, 
                      tree.gml, 
                      node.col = "NA", 
                      xaxis.title = "Time Point", 
                      yaxis.title = "Relative Cellular Prevalence", 
                      alpha = 30, 
                      genotype.position = "stack", 
                      show.root = "T", 
                      perturbations = "NA", 
                      sort = "T", 
                      width = NULL, 
                      height = NULL) {

  # parse csv
  clonal.prev.data = read.csv(clonal.prev.csv)
  clonal.prev.JSON <- jsonlite::toJSON(clonal.prev.data)
  gmlString <- paste(readLines(tree.gml), collapse=" ")

  # check type of user inputs
  if (!is.numeric(alpha)) {
    stop("Alpha value must be numeric.")
  }
  if (!(genotype.position %in% c("stack", "centre", "space"))) {
    stop("Genotype position must be one of c(\"stack\", \"centre\", \"space\")")
  }

  # node colours
  if (is.data.frame(node.col)) {

    # catch error where node colour data frame is incorrectly formatted
    if (length(colnames(node.col)) != 2) {
      stop(paste("Node colour data frame should consist of 2 columns: ",
        "(1) {String} the node labels, ",
        "(2) {String} the corresponding node colour.", sep=""))
    }

    # adjust column names
    colnames(node.col)[1] <- "node_label"
    colnames(node.col)[2] <- "col"

    # df to JSON
    node.col <- jsonlite::toJSON(node.col) 
  }

  # perturbations
  if (is.data.frame(perturbations)) {

    # catch error where perturbations data frame is incorrectly formatted
    if (length(colnames(perturbations)) != 4) {
      stop(paste("Perturbations data frame should consist of 4 columns: ", 
        "(1) {String} the perturbation name, ",
        "(2) {String} the time point (as labelled in cellular prevalence data) BEFORE perturbation, ", 
        "(3) {String} the time point (as labelled in cellular prevalence data) AFTER perturbation, ", 
        "(4) {Number} the fraction of total tumour content remaining at the time of perturbation.", sep=""))
    }

    # check that columns are of the correct type
    pert_classes <- sapply(perturbations, class);
    if (!(pert_classes[1] %in% c("factor", "character"))) {
      stop("In perturbations data frame, perturbation name must be of type String or Factor.")
    }
    if (!(pert_classes[2] %in% c("factor", "character"))) {
      stop("In perturbations data frame, the time point before perturbation must be of type String or Factor.")
    }
    if (!(pert_classes[3] %in% c("factor", "character"))) {
      stop("In perturbations data frame, the time point after perturbation must be of type String or Factor.")
    }
    if (!(pert_classes[4] == "numeric")) {
      stop("In perturbations data frame, fraction of total tumour content remaining must be of type Numeric.")
    }

    # adjust column names
    colnames(perturbations)[1] <- "perturbation"
    colnames(perturbations)[2] <- "prev_tp"
    colnames(perturbations)[3] <- "next_tp"
    colnames(perturbations)[4] <- "frac"

    # df to JSON
    perturbations <- jsonlite::toJSON(perturbations)
  }

  # forward options using x
  x = list(
    patient = patient,
    clonal_prev_JSON = clonal.prev.JSON,
    tree_gml = gmlString,
    node_col_JSON = node.col,
    xaxis_title = xaxis.title,
    yaxis_title = yaxis.title,
    alpha = alpha,
    gtypePos = genotype.position,
    show_root = show.root,
    perturbations_JSON = perturbations,
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
