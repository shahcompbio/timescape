#' Timesweeps
#'
#' \code{timesweep} generates patient clonal timesweeps.
#'
#' @param clonal.prev Clonal prevalence data frame.
#'   Format: columns are (1) {String} patient name
#'                       (2) {String} time point
#'                       (3) {String} clone id
#'                       (4) {Number} clonal prevalence.
#' @param tree Tree edges data frame. The root of the tree (id: "Root") must be specified as a source.
#'   Format: columns are (1) {String} patient name
#'                       (2) {String} source node id
#'                       (3) {String} target node id.
#'   e.g. data.frame(patient_name = c("SAMPLE_PATIENT"), 
#'                   source = c("Root","1","1","6","5","3"), 
#'                   target=c("1","3","6","5","4","2"))
#' @param node.col Data frame with node labels and colours 
#'   Format: columns are (1) {String} the node labels
#'                       (2) {String} the corresponding colour for each node label.
#'   e.g. data.frame(node_label = c("1","2","3","4","5"), 
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
#'                       (4) {Number} the fraction of total tumour content remaining at the time of perturbation.
#'   e.g. data.frame(perturbation = c("Chemo"), 
#'                    prev_tp = c("T1"),
#'                    next_tp = c("T2"), 
#'                    frac = c(0.2))
#' @param sort Whether (T) or not (F) to vertically sort the genotypes by their emergence values
#' @param width Width of the plot. 
#' @param height Height of the plot.
#' @export
#' @examples
#' library("timesweep")
#' clonal.prev <- read.csv(system.file("extdata", "clonal_dynamics.csv", package = "timesweep"))
#' tree.edges <- data.frame(patient_name = c("SAMPLE_PATIENT"), source = c("Root","1","1","6","5","3"), target=c("1","3","6","5","4","2"))
#' timesweep(clonal.prev = clonal.prev, tree.edges = tree.edges)
timesweep <- function(clonal.prev, 
                      tree.edges, 
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

  # check type of user inputs
  if (!is.numeric(alpha)) {
    stop("Alpha value must be numeric.")
  }
  if (missing(clonal.prev)) {
    stop("Clonal prevalence data frame must be provided.")
  }
  if (missing(tree.edges)) {
    stop("Tree edge data frame must be provided.")
  }

  # CLONAL PREVALENCE DATA

  # adjust column names 
  colnames(clonal.prev)[1] <- "patient_name"
  colnames(clonal.prev)[2] <- "timepoint"
  colnames(clonal.prev)[3] <- "cluster"
  colnames(clonal.prev)[4] <- "clonal_prev"

  # ensure data is of the correct type
  clonal.prev["patient_name"] <- lapply(clonal.prev["patient_name"], as.character)
  clonal.prev["timepoint"] <- lapply(clonal.prev["timepoint"], as.character)
  clonal.prev["cluster"] <- lapply(clonal.prev["cluster"], as.character)
  clonal.prev["clonal_prev"] <- lapply(clonal.prev["clonal_prev"], as.numeric)

  # parse clonal prevalence data
  clonal.prev.JSON <- jsonlite::toJSON(clonal.prev)

  # TREE EDGES DATA

  # adjust column names 
  colnames(tree.edges)[1] <- "patient_name"
  colnames(tree.edges)[2] <- "source"
  colnames(tree.edges)[3] <- "target"

  # ensure data is of the correct type
  tree.edges["patient_name"] <- lapply(tree.edges["patient_name"], as.character)
  tree.edges["source"] <- lapply(tree.edges["source"], as.character)
  tree.edges["target"] <- lapply(tree.edges["target"], as.character)

  # catch if no root is in the tree
  if (!("Root" %in% tree.edges[,"source"])) {
    stop("The root (id: \"Root\") must be specified as a source.")
  }

  # catch multiple patients
  if (length(unique(tree.edges[,"patient_name"])) > 1) {
    stop("Currently, timesweep only takes in one patient - your tree edges data frame contains more than one patient.")
  }
  if (length(unique(clonal.prev[,"patient_name"])) > 1) {
    stop("Currently, timesweep only takes in one patient - your clonal prevalence data frame contains more than one patient.")
  }
  if (unique(tree.edges[,"patient_name"]) != unique(clonal.prev[1])) {
    stop("Your tree edge and clonal prevalence data frames contain different patient names. Please ensure the patient name is the same.")
  }
  patient = tree.edges[1,"patient_name"]

  # GENOTYPE POSITIONING

  if (!(genotype.position %in% c("stack", "centre", "space"))) {
    stop("Genotype position must be one of c(\"stack\", \"centre\", \"space\")")
  }

  # NODE COLOURS
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

  # PERTURBATIONS
  if (is.data.frame(perturbations)) {

    # catch error where perturbations data frame is incorrectly formatted
    if (length(colnames(perturbations)) != 4) {
      stop(paste("Perturbations data frame should consist of 4 columns: ", 
        "(1) {String} the perturbation name, ",
        "(2) {String} the time point (as labelled in cellular prevalence data) BEFORE perturbation, ", 
        "(3) {String} the time point (as labelled in cellular prevalence data) AFTER perturbation, ", 
        "(4) {Number} the fraction of total tumour content remaining at the time of perturbation.", sep=""))
    }

    # adjust column names
    colnames(perturbations)[1] <- "perturbation"
    colnames(perturbations)[2] <- "prev_tp"
    colnames(perturbations)[3] <- "next_tp"
    colnames(perturbations)[4] <- "frac"

    # check that columns are of the correct type
    perturbations["perturbation"] <- lapply(perturbations["perturbation"], as.character)
    perturbations["prev_tp"] <- lapply(perturbations["prev_tp"], as.character)
    perturbations["next_tp"] <- lapply(perturbations["next_tp"], as.character)
    perturbations["frac"] <- lapply(perturbations["frac"], as.numeric)

    # df to JSON
    perturbations <- jsonlite::toJSON(perturbations)
  }

  # forward options using x
  x = list(
    patient = patient,
    clonal_prev_JSON = clonal.prev.JSON,
    tree_edges = tree.edges,
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
