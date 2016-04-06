#' Timesweeps
#'
#' \code{timesweep} generates patient clonal timesweeps.
#'
#' @param clonal_prev {Data Frame} Clonal prevalence.
#'   Format: columns are (1) {String} "timepoint" - time point
#'                       (2) {String} "clone_id" - clone id
#'                       (3) {Number} "clonal_prev" - clonal prevalence.
#' @param tree_edges {Data Frame} Tree edges of a rooted tree.
#'   Format: columns are (1) {String} "source" - source node id
#'                       (2) {String} "target" - target node id.
#' @param mutations {Data Frame} (Optional) Mutations occurring at each clone.
#'   Format: columns are (1) {String} "chrom" - chromosome number
#'                       (2) {Number} "coord" - coordinate of mutation on chromosome
#'                       (3) {String} "clone_id" - clone id
#'                       (4) {String} "timepoint" - time point
#'                       (5) {Number} "VAF" - variant allele frequency of the mutation in the corresponding sample
#'                       (6) {String} (Optional) "gene_name" - name of the affected gene (can be "" if none affected).
#'                       (7) {String} (Optional) "effect" - effect of the mutation 
#'                                                          (e.g. non-synonymous, upstream, etc.)
#'                       (8) {String} (Optional) "impact" - impact of the mutation (e.g. low, moderate, high).
#' @param clone_colours {Data Frame} (Optional) Clone ids and their corresponding colours 
#'   Format: columns are (1) {String} "clone_id" - the clone ids
#'                       (2) {String} "colour" - the corresponding Hex colour for each clone id.
#' @param xaxis_title {String} (Optional) x-axis title. 
#' @param yaxis_title {String} (Optional) y-axis title.
#' @param alpha {Number} (Optional) Alpha value for sweeps, range [0, 100].
#' @param genotype_position {String} (Optional) How to position the genotypes from ["centre", "stack", "space"] 
#'   "centre" -- genotypes are centred with respect to their ancestors
#'   "stack" -- genotypes are stacked such that no genotype is split at any time point
#'   "space" -- genotypes are stacked but with a bit of spacing at the top (emergence is clearer)
#' @param perturbations {Data Frame} (Optional) Any perturbations that occurred between two time points, 
#'   and the fraction of total tumour content left.
#'   Format: columns are (1) {String} "pert_name" - the perturbation name
#'                       (2) {String} "prev_tp" - the time point (as labelled in clonal prevalence data) 
#'                                                BEFORE perturbation
#'                       (3) {Number} "frac" - the fraction of total tumour content remaining at the 
#'                                             time of perturbation, range [0, 1].
#' @param sort {Boolean} (Optional) Whether (TRUE) or not (FALSE) to vertically sort the genotypes by their emergence values (descending).
#' @param width {Number} (Optional) Width of the plot. 
#' @param height {Number} (Optional) Height of the plot.
#' @export
#' @examples
#' library("timesweep")
#' clonal_prev <- data.frame( timepoint = c(rep("T1", 6), rep("T2", 6)), 
#'                            clone_id = c("1","6","5","4","3","2","1","6","5","4","3","2"),
#'                            clonal_prev = c("0.0205127","0.284957","0.637239","0.0477972","0.00404099","0.00545235",
#'                                            "0.0134362","0.00000150677","0.00000385311","0.000627522","0.551521","0.43441"))
#' tree_edges <- data.frame(source = c("1","1","6","5","3"), 
#'                          target = c("3","6","5","4","2"))
#' clone_colours <- data.frame( clone_id = c("1","2","3","4","5","6"), 
#'                              colour = c("F8766D66", "B79F0066", "00BA3866", "00BFC466", "619CFF66", "F564E366"))
#' perturbations <- data.frame( pert_name = c("Chemo"), 
#'                              prev_tp = c("T1"),
#'                               frac = c(0.1))
#' timesweep(clonal_prev = clonal_prev, tree_edges = tree_edges, clone_colours = clone_colours, perturbations = perturbations)
timesweep <- function(clonal_prev, 
                      tree_edges, 
                      mutations = "NA",
                      clone_colours = "NA", 
                      xaxis_title = "Time Point", 
                      yaxis_title = "Relative Cellular Prevalence", 
                      alpha = 50, 
                      genotype_position = "stack", 
                      perturbations = "NA", 
                      sort = FALSE, 
                      width = 900, 
                      height = NULL) {
  
  # ENSURE MINIMUM DIMENSIONS SATISFIED

  # set height if not set by user
  if (mutations == "NA") { # no mutations
    height = 250
  }
  else { # mutations
    height = 500
  }

  # check height is big enough 
  min_width = 600
  if (mutations == "NA") { # no mutations
    min_height = 250
  }
  else { # mutations
    min_height = 500
  }

  if (height < min_height) {
    stop(paste("Height must be greater than or equal to ", min_height, "px.", sep=""))
  }
  if (width < min_width) {
    stop(paste("Width must be greater than or equal to ", min_width, "px.", sep=""))
  }

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

  # CLONAL PREVALENCE DATA

  # ensure column names are correct
  if (!("timepoint" %in% colnames(clonal_prev)) ||
      !("clone_id" %in% colnames(clonal_prev)) ||
      !("clonal_prev" %in% colnames(clonal_prev))) {
    stop(paste("Clonal prevalence data frame must have the following column names: ", 
        "\"timepoint\", \"clone_id\", \"clonal_prev\"", sep=""))
  }

  # ensure data is of the correct type
  clonal_prev$timepoint <- as.character(clonal_prev$timepoint)
  clonal_prev$clone_id <- as.character(clonal_prev$clone_id)
  clonal_prev$clonal_prev <- as.numeric(as.character(clonal_prev$clonal_prev))

  # TREE EDGES DATA

  # ensure column names are correct
  if (!("source" %in% colnames(tree_edges)) ||
      !("target" %in% colnames(tree_edges))) {
    stop(paste("Tree edges data frame must have the following column names: ", 
        "\"source\", \"target\"", sep=""))
  }

  # ensure data is of the correct type
  tree_edges$source <- as.character(tree_edges$source)
  tree_edges$target <- as.character(tree_edges$target)

  # get list of clones in the phylogeny
  clones_in_phylo <- unique(c(tree_edges$source, tree_edges$target))

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

  # MUTATIONS DATA

  if (is.data.frame(mutations)) {
    print("[Progress] Processing mutations data...")

    # ensure column names are correct
    if (!("chrom" %in% colnames(mutations)) ||
        !("coord" %in% colnames(mutations)) ||
        !("clone_id" %in% colnames(mutations)) ||
        !("timepoint" %in% colnames(mutations)) ||
        !("VAF" %in% colnames(mutations))) {
      stop(paste("Mutations data frame must have the following column names: ", 
          "\"chrom\", \"coord\", \"clone_id\", \"timepoint\", \"VAF\".", sep=""))
    }

    # ensure data is of the correct type
    mutations$chrom <- toupper(as.character(mutations$chrom)) # upper case X & Y
    mutations$coord <- as.character(mutations$coord)
    mutations$timepoint <- as.character(mutations$timepoint)
    mutations$clone_id <- as.character(mutations$clone_id)
    mutations$VAF <- as.numeric(as.character(mutations$VAF))

    # check for optional info, and ensure data of correct type
    extra_columns <- vector()
    if ("gene_name" %in% colnames(mutations)) {
      extra_columns <- append(extra_columns, "gene_name")
      mutations$gene_name <- as.character(mutations$gene_name)
    }
    if ("effect" %in% colnames(mutations)) {
      extra_columns <- append(extra_columns, "effect")
      mutations$effect <- as.character(mutations$effect)
    }
    if ("impact" %in% colnames(mutations)) {
      extra_columns <- append(extra_columns, "impact")
      mutations$impact <- as.character(mutations$impact)
    }

    # check that all CLONE IDS in the mutations data are present in the clonal prev data
    mutations_clone_ids <- unique(mutations$clone_id)
    clonal_prev_clone_ids <- unique(clonal_prev$clone_id)
    clone_ids_missing_from_clonal_prev_data <- setdiff(mutations_clone_ids, clonal_prev_clone_ids)
    if (length(clone_ids_missing_from_clonal_prev_data) > 0) {
      stop(paste("The following clone ID(s) are present in the mutations data but ",
        "are missing from the clonal prevalence data: ",
        paste(clone_ids_missing_from_clonal_prev_data, collapse=", "), ".", sep=""))
    }

    # create a location column, combining the chromosome and the coordinate
    mutations$location <- apply(mutations[, c("chrom","coord")], 1 , paste, collapse = ":")

    # coordinate is now a number
    mutations$coord <- as.numeric(as.character(mutations$coord))

    # check X & Y chromosomes are labelled "X" and "Y", not "23", "24"
    num_23 <- mutations[which(mutations$chrom == "23"),]
    if (nrow(num_23) > 0) {
      stop(paste("Chromosome numbered \"23\" was detected in mutations data frame - X and Y chromosomes ",
        "must be labelled \"X\" and \"Y\".", sep=""))
    }

    # keep only those mutations whose clone ids are present in the phylogeny
    mutations <- mutations[which(mutations$clone_id %in% clones_in_phylo),]


    # MUTATION PREVALENCES DATA

    mutation_prevalences <- mutations

    print("[Progress] Processing mutation prevalences data...")

    # keep only those mutations whose clone ids are present in the phylogeny
    mutation_prevalences <- mutation_prevalences[which(mutation_prevalences$clone_id %in% clones_in_phylo),]
    if (nrow(mutation_prevalences) > 10000) {
      print(paste("[WARNING] Number of rows in mutations data exceeds 10,000. ",
        "Resultantly, visualization may be slow. ",
        "It is recommended to filter the data to a smaller set of mutations.", sep=""))
    }

    # compress results
    prevs_split <- split(mutation_prevalences, f = mutation_prevalences$location)

    # reduce the size of the data frame in each list
    prevs_split_small <- lapply(prevs_split, function(prevs) {
      return(prevs[,c("timepoint", "VAF")])
    })


    # MUTATION INFO 
    mutation_info <- unique(mutations[,c("chrom","coord","clone_id",extra_columns)])
  }
  else {
    prevs_split_small <- "NA"
    mutation_info <- "NA"
  }

  # forward options using x
  x = list(
    clonal_prev = jsonlite::toJSON(clonal_prev),
    tree_edges = jsonlite::toJSON(tree_edges),
    clone_cols = jsonlite::toJSON(clone_colours),
    mutations = jsonlite::toJSON(mutation_info),
    mutation_prevalences = jsonlite::toJSON(prevs_split_small),
    xaxis_title = xaxis_title,
    yaxis_title = yaxis_title,
    alpha = alpha,
    genotype_position = genotype_position,
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
