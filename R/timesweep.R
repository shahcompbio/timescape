#' <Add Title>
#'
#' <Add Description>
#'
#' @import htmlwidgets, jsonlite
#'
#' @export
timesweep <- function(patient, clonal_prev_csv, tree_gml, width = NULL, height = NULL) {

  # parse csv
  clonal_prev_data = read.csv(clonal_prev_csv)
  clonal_prev_JSON <- toJSON(clonal_prev_data)
  gmlString <- paste(readLines(tree_gml), collapse=" ")

  # forward options using x
  x = list(
    patient = patient,
    clonal_prev_data = clonal_prev_JSON,
    tree_gml = gmlString
  )

  # create widget
  htmlwidgets::createWidget(
    name = 'timesweep',
    x,
    width = width,
    height = height,
    package = 'timesweep'
  )
}

#' Widget output function for use in Shiny
#'
#' @export
timesweepOutput <- function(outputId, width = '100%', height = '400px'){
  shinyWidgetOutput(outputId, 'timesweep', width, height, package = 'timesweep')
}

#' Widget render function for use in Shiny
#'
#' @export
renderTimesweep <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) } # force quoted
  shinyRenderWidget(expr, timesweepOutput, env, quoted = TRUE)
}
