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
#' @param width Width of the plot. 
#' @param height Height of the plot.
#' @export
#' @examples
#' library("timesweep")
#' timesweep("SAMPLE_PATIENT", system.file("extdata", "clonal_dynamics.csv", package = "timesweep"), 
#'            system.file("extdata", "tree.gml", package = "timesweep"))
timesweep <- function(patient, clonal.prev.csv, tree.gml, node.col, xaxis.title, yaxis.title, width = NULL, 
                      height = NULL) {

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

  # forward options using x
  x = list(
    patient = patient,
    clonal_prev_JSON = clonal.prev.JSON,
    tree_gml = gmlString,
    node_col_JSON = node.col.JSON,
    xaxis_title = xaxis.title,
    yaxis_title = yaxis.title
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
