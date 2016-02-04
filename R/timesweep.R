#' Timesweeps
#'
#' \code{timesweep} generates patient clonal timesweeps.
#'
#' @param clonal_prev Clonal prevalence data frame.
#'   Format: columns are (1) {String} "patient_name" - patient name
#'                       (2) {String} "timepoint" - time point
#'                       (3) {String} "clone_id" - clone id
#'                       (4) {Number} "clonal_prev" - clonal prevalence.
#' @param tree_edges Tree edges data frame. The root of the tree (id: "Root") must be specified as a source.
#'   Format: columns are (1) {String} "patient_name" - patient name
#'                       (2) {String} "source" - source node id
#'                       (3) {String} "target" - target node id.
#'   e.g. data.frame(patient_name = c("SAMPLE_PATIENT"), 
#'                   source = c("Root","1","1","6","5","3"), 
#'                   target = c("1","3","6","5","4","2"))
#' @param clone_colours Data frame with clone ids and their corresponding colours 
#'   Format: columns are (1) {String} "clone_id" - the clone ids
#'                       (2) {String} "colour" - the corresponding Hex colour for each clone id.
#'   e.g. data.frame(clone_id = c("1","2","3","4","5","6"), 
#'                    colour = c("F8766D66", "A3A50066", "00BF7D66", "00B0F666", "E76BF366", "B79F0066"))
#' @param xaxis_title x-axis title. 
#' @param yaxis_title y-axis title.
#' @param alpha Alpha value for sweeps, range [0, 100].
#' @param genotype_position How to position the genotypes from ["centre", "stack", "space"] 
#'   "centre" -- genotypes are centred with respect to their ancestors
#'   "stack" -- genotypes are stacked such that no genotype is split at any time point
#'   "space" -- genotypes are stacked but with a bit of spacing at the top (emergence is clearer)
#' @param show_root Whether (TRUE) or not (FALSE) to show the root in the timesweep view.
#' @param perturbations Data frame of any perturbations that occurred between two time points, 
#'   and the fraction of total tumour content left.
#'   Format: columns are (1) {String} "pert_name" - the perturbation name
#'                       (2) {String} "prev_tp" - the time point (as labelled in clonal prevalence data) 
#'                                                BEFORE perturbation
#'                       (3) {Number} "frac" - the fraction of total tumour content remaining at the 
#'                                             time of perturbation, range [0, 1].
#'   e.g. data.frame(pert_name = c("Chemo"), 
#'                    prev_tp = c("T1"),
#'                    frac = c(0.1))
#' @param sort Whether (TRUE) or not (FALSE) to vertically sort the genotypes by their emergence values (descending).
#' @param width Width of the plot. 
#' @param height Height of the plot.
#' @export
#' @examples
#' library("timesweep")
#' clonal_prev <- data.frame( patient_name = c("SAMPLE_PATIENT"), 
#'                            timepoint = c(rep("T1", 6), rep("T2", 6)), 
#'                            clone_id = c("1","6","5","4","3","2","1","6","5","4","3","2"),
#'                            clonal_prev = c("0.0205127","0.284957","0.637239","0.0477972","0.00404099","0.00545235",
#'                                            "0.0134362","0.00000150677","0.00000385311","0.000627522","0.551521","0.43441"))
#' tree_edges <- data.frame(patient_name = c("SAMPLE_PATIENT"), 
#'                          source = c("Root","1","1","6","5","3"), 
#'                          target = c("1","3","6","5","4","2"))
#' clone_colours <- data.frame( clone_id = c("1","2","3","4","5","6"), 
#'                              colour = c("F8766D66", "B79F0066", "00BA3866", "00BFC466", "619CFF66", "F564E366"))
#' perturbations <- data.frame( pert_name = c("Chemo"), 
#'                              prev_tp = c("T1"),
#'                               frac = c(0.1))
#' timesweep(clonal_prev = clonal_prev, tree_edges = tree_edges, clone_colours = clone_colours, perturbations = perturbations)
timesweep <- function(clonal_prev, 
                      tree_edges, 
                      clone_colours = "NA", 
                      xaxis_title = "Time Point", 
                      yaxis_title = "Relative Cellular Prevalence", 
                      alpha = 50, 
                      genotype_position = "stack", 
                      show_root = TRUE, 
                      perturbations = "NA", 
                      sort = TRUE, 
                      width = NULL, 
                      height = NULL) {
  
  # CHECK REQUIRED INPUTS ARE PRESENT 
  if (missing(clonal_prev)) {
    stop("Clonal prevalence data frame must be provided.")
  }
  if (missing(tree_edges)) {
    stop("Tree edge data frame must be provided.")
  }

  # ALPHA VALUE
  if (!is.numeric(alpha)) {
    stop("Alpha value must be numeric.")
  }

  # SORTED GENOTYPES
  if (!is.logical(sort)) {
    stop("Sort parameter must be a boolean.")
  }

  # SHOW ROOT
  if (!is.logical(show_root)) {
    stop("Show root parameter must be a boolean.")
  }
  
  # CLONAL PREVALENCE DATA

  # ensure column names are correct
  if (!("patient_name" %in% colnames(clonal_prev)) ||
      !("timepoint" %in% colnames(clonal_prev)) ||
      !("clone_id" %in% colnames(clonal_prev)) ||
      !("clonal_prev" %in% colnames(clonal_prev))) {
    stop(paste("Clonal prevalence data frame must have the following column names: ", 
        "\"patient_name\", \"timepoint\", \"clone_id\", \"clonal_prev\"", sep=""))
  }

  # ensure data is of the correct type
  clonal_prev$patient_name <- as.character(clonal_prev$patient_name)
  clonal_prev$timepoint <- as.character(clonal_prev$timepoint)
  clonal_prev$clone_id <- as.character(clonal_prev$clone_id)
  clonal_prev$clonal_prev <- as.numeric(as.character(clonal_prev$clonal_prev))

  # TREE EDGES DATA

  # ensure column names are correct
  if (!("patient_name" %in% colnames(tree_edges)) ||
      !("source" %in% colnames(tree_edges)) ||
      !("target" %in% colnames(tree_edges))) {
    stop(paste("Tree edges data frame must have the following column names: ", 
        "\"patient_name\", \"source\", \"target\"", sep=""))
  }

  # ensure data is of the correct type
  tree_edges$patient_name <- as.character(tree_edges$patient_name)
  tree_edges$source <- as.character(tree_edges$source)
  tree_edges$target <- as.character(tree_edges$target)

  # catch if no root is in the tree
  if (!("Root" %in% tree_edges[,"source"])) {
    stop("The root (id: \"Root\") must be specified as a source.")
  }

  # catch multiple patients
  if (length(unique(tree_edges[,"patient_name"])) > 1) {
    stop("Currently, timesweep only takes in one patient - your tree edges data frame contains more than one patient.")
  }
  if (length(unique(clonal_prev[,"patient_name"])) > 1) {
    stop("Currently, timesweep only takes in one patient - your clonal prevalence data frame contains more than one patient.")
  }
  if (unique(tree_edges[,"patient_name"]) != unique(clonal_prev[1])) {
    stop("Your tree edge and clonal prevalence data frames contain different patient names. Please ensure the patient name is the same.")
  }
  patient = tree_edges[1,"patient_name"]

  # GENOTYPE POSITIONING

  if (!(genotype_position %in% c("stack", "centre", "space"))) {
    stop("Genotype position must be one of c(\"stack\", \"centre\", \"space\")")
  }

  # NODE COLOURS
  if (is.data.frame(clone_colours)) {

    # ensure column names are correct
    if (!("clone_id" %in% colnames(clone_colours)) ||
        !("colour" %in% colnames(clone_colours))) {
      stop(paste("Node colour data frame must have the following column names: ", 
          "\"clone_id\", \"colour\"", sep=""))
    }
  }

  # PERTURBATIONS
  if (is.data.frame(perturbations)) {

    # ensure column names are correct
    if (!("pert_name" %in% colnames(perturbations)) ||
        !("prev_tp" %in% colnames(perturbations)) ||
        !("frac" %in% colnames(perturbations))) {
      stop(paste("Perturbations data frame must have the following column names: ", 
          "\"pert_name\", \"prev_tp\", \"frac\"", sep=""))
    }

    # check that columns are of the correct type
    perturbations$pert_name <- as.character(perturbations$pert_name)
    perturbations$prev_tp <- as.character(perturbations$prev_tp)
    perturbations$frac <- as.character(perturbations$frac)

  }

  # SORTED GENOTYPES

  # forward options using x
  x = list(
    patient = patient,
    clonal_prev = jsonlite::toJSON(clonal_prev),
    tree_edges = tree_edges,
    clone_cols = jsonlite::toJSON(clone_colours),
    xaxis_title = xaxis_title,
    yaxis_title = yaxis_title,
    alpha = alpha,
    genotype_position = genotype_position,
    show_root = show_root,
    perturbations = jsonlite::toJSON(perturbations),
    sort_gtypes = sort
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
