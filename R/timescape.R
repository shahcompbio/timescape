#' TimeScape
#'
#' \code{timescape} generates patient clonal timescapes.
#'
#' @param clonal_prev {Data Frame} Clonal prevalence. Note: timepoints will be alphanumerically sorted in the view.
#'   Format: columns are (1) {String} "timepoint" - time point
#'                       (2) {String} "clone_id" - clone id
#'                       (3) {Number} "clonal_prev" - clonal prevalence.
#' @param tree_edges {Data Frame} Tree edges of a rooted tree.
#'   Format: columns are (1) {String} "source" - source node id
#'                       (2) {String} "target" - target node id.
#' @param mutations {Data Frame} (Optional) Mutations occurring at each clone. Any additional field will be shown in the mutation table.
#'   Format: columns are (1) {String} "chrom" - chromosome number
#'                       (2) {Number} "coord" - coordinate of mutation on chromosome
#'                       (3) {String} "clone_id" - clone id
#'                       (4) {String} "timepoint" - time point
#'                       (5) {Number} "VAF" - variant allele frequency of the mutation in the corresponding timepoint. 
#' @param clone_colours {Data Frame} (Optional) Clone ids and their corresponding colours 
#'   Format: columns are (1) {String} "clone_id" - the clone ids
#'                       (2) {String} "colour" - the corresponding Hex colour for each clone id.
#' @param xaxis_title {String} (Optional) x-axis title. Default is "Time Point".
#' @param yaxis_title {String} (Optional) y-axis title. Default is "Clonal Prevalence".
#' @param phylogeny_title {String} (Optional) Legend phylogeny title. Default is "Clonal Phylogeny".
#' @param alpha {Number} (Optional) Alpha value for sweeps, range [0, 100].
#' @param genotype_position {String} (Optional) How to position the genotypes from ["centre", "stack", "space"] 
#'   "centre" -- genotypes are centred with respect to their ancestors
#'   "stack" -- genotypes are stacked such that no genotype is split at any time point
#'   "space" -- genotypes are stacked but with a bit of spacing at the bottom
#' @param perturbations {Data Frame} (Optional) Any perturbations that occurred between two time points, 
#'   and the fraction of total tumour content remaining.
#'   Format: columns are (1) {String} "pert_name" - the perturbation name
#'                       (2) {String} "prev_tp" - the time point (as labelled in clonal prevalence data) 
#'                                                BEFORE perturbation
#'                       (3) {Number} "frac" - the fraction of total tumour content remaining at the 
#'                                             time of perturbation, range [0, 1].
#' @param sort {Boolean} (Optional) Whether (TRUE) or not (FALSE) to vertically sort the genotypes by their emergence values (descending). 
#'                       Default is FALSE. 
#'                       Note that genotype sorting will always retain the phylogenetic hierarchy, and this parameter will only affect the ordering of siblings.
#' @param show_warnings {Boolean} (Optional) Whether or not to show any warnings. Default is TRUE.
#' @param width {Number} (Optional) Width of the plot. Minimum width is 450.
#' @param height {Number} (Optional) Height of the plot. Minimum height with and without mutations is 500 and 260, respectively. 
#' @export
#' @examples
#' library("timescape")
#'
#' # EXAMPLE 1 - Acute myeloid leukemia patient, Ding et al., 2012
#'
#' # genotype tree edges
#' tree_edges <- read.csv(system.file("extdata", "AML_tree_edges.csv", package = "timescape"))
#' # clonal prevalences
#' clonal_prev <- read.csv(system.file("extdata", "AML_clonal_prev.csv", package = "timescape"))
#' # targeted mutations
#' mutations <- read.csv(system.file("extdata", "AML_mutations.csv", package = "timescape"))
#' # perturbations
#' perturbations <- data.frame( pert_name = c("Chemotherapy"), 
#'                              prev_tp = c("Diagnosis"),
#'                               frac = c(0.1))
#' # run timescape
#' timescape(clonal_prev = clonal_prev, tree_edges = tree_edges, perturbations = perturbations, mutations = mutations)
#'
#' # EXAMPLE 2 - Patient 7, McPherson and Roth et al., 2016
#'
#'
#' # genotype tree edges
#' tree_edges <- read.csv(system.file("extdata", "px7_tree_edges.csv", package = "timescape"))
#' # clonal prevalences
#' clonal_prev <- read.csv(system.file("extdata", "px7_clonal_prev.csv", package = "timescape"))
#' # clone colours
#' clone_colours <- data.frame(clone_id = c("A","B","C","D","E"), 
#'                             colour = c("d0ced0", "2CD0AB", "FFD94B", "FD8EE5", "F8766D"))
#' # run timescape
#' timescape(clonal_prev = clonal_prev, tree_edges = tree_edges, clone_colours = clone_colours, height=260, alpha=15)
timescape <- function(clonal_prev, 
                      tree_edges, 
                      mutations = "NA",
                      clone_colours = "NA", 
                      xaxis_title = "Time Point", 
                      yaxis_title = "Clonal Prevalence", 
                      phylogeny_title = "Clonal Phylogeny",
                      alpha = 50, 
                      genotype_position = "stack", 
                      perturbations = "NA", 
                      sort = FALSE, 
                      show_warnings = TRUE,
                      width = 900, 
                      height = NULL) {

  # forward options using x
  x = processUserData(clonal_prev, 
                      tree_edges, 
                      mutations,
                      clone_colours, 
                      xaxis_title, 
                      yaxis_title, 
                      phylogeny_title,
                      alpha, 
                      genotype_position, 
                      perturbations, 
                      sort, 
                      show_warnings,
                      width, 
                      height)

  # create widget
  htmlwidgets::createWidget(
    name = "timescape",
    x,
    width = width,
    height = height,
    package = "timescape"
  )
}

#' Widget output function for use in Shiny
#'
#' @export
timescapeOutput <- function(outputId, width = "100%", height = "400px"){
  htmlwidgets::shinyWidgetOutput(outputId, "timescape", width, height, 
                                 package = "timescape")
}

#' Widget render function for use in Shiny
#'
#' @export
renderTimescape <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) } # force quoted
  htmlwidgets::shinyRenderWidget(expr, timescapeOutput, env, quoted = TRUE)
}

#' Function to process the user data
processUserData <- function(clonal_prev, 
                      tree_edges, 
                      mutations,
                      clone_colours, 
                      xaxis_title, 
                      yaxis_title, 
                      phylogeny_title,
                      alpha, 
                      genotype_position, 
                      perturbations, 
                      sort, 
                      show_warnings,
                      width, 
                      height) {

  # ENSURE MINIMUM DIMENSIONS SATISFIED
  checkMinDims(mutations, height, width)

  # CHECK REQUIRED INPUTS ARE PRESENT
  checkRequiredInputs(clonal_prev, tree_edges)

  # ALPHA VALUE
  checkAlpha(alpha)

  # SORTED GENOTYPES
  checkSort(sort)

  # CLONAL PREVALENCE DATA
  clonal_prev <- checkClonalPrev(clonal_prev)

  # TREE EDGES DATA
  tree_edges <- checkTreeEdges(tree_edges)

  # GENOTYPE POSITIONING
  checkGtypePositioning(genotype_position)

  # CHECK CLONE COLOURS
  checkCloneColours(clone_colours) 

  # CHECK PERTURBATIONS
  perturbations <- checkPerts(perturbations)

  # MUTATIONS DATA
  mut_data <- getMutationsData(mutations, tree_edges, clonal_prev)
  mutation_info <- mut_data$mutation_info
  mutation_prevalences <- mut_data$mutation_prevalences
  if (is.data.frame(mutations)) {
    mutations_provided <- TRUE
  }
  else {
    mutations_provided <- FALSE
  }

  # REPLACE SPACES WITH UNDERSCORES
  spaces_replaced <- replaceSpaces(clonal_prev, tree_edges, clone_colours, mutation_info, mutations, mutation_prevalences)
  timepoint_map <- spaces_replaced$timepoint_map 
  clone_id_map <- spaces_replaced$clone_id_map 
  clonal_prev <- spaces_replaced$clonal_prev 
  tree_edges <- spaces_replaced$tree_edges
  mutation_info <- spaces_replaced$mutation_info
  clone_colours <- spaces_replaced$clone_colours
  mutation_prevalences <- spaces_replaced$mutation_prevalences

  # forward options using x
  return(list(
    clonal_prev = jsonlite::toJSON(clonal_prev),
    gtype_tree_edges = jsonlite::toJSON(tree_edges),
    clone_cols = jsonlite::toJSON(clone_colours),
    mutations = jsonlite::toJSON(mutation_info),
    mutation_prevalences = jsonlite::toJSON(mutation_prevalences),
    mutations_provided=mutations_provided, # whether or not mutations are provided
    xaxis_title = as.character(xaxis_title),
    yaxis_title = as.character(yaxis_title),
    phylogeny_title = as.character(phylogeny_title),
    alpha = alpha,
    genotype_position = genotype_position,
    perturbations = jsonlite::toJSON(perturbations),
    sort_gtypes = sort,
    timepoint_map = jsonlite::toJSON(timepoint_map),
    clone_id_map = jsonlite::toJSON(clone_id_map)
  ))
}

#' Function to check minimum dimensions
#' 
#' @param mutations -- mutations provided by user
#' @param height -- height provided by user
#' @param width -- width provided by user
checkMinDims <- function(mutations, height, width) {

  # set height if not set by user
  if (is.null(height)) {
    if (!is.data.frame(mutations)) { # no mutations
      height = 260
    }
    else { # mutations
      height = 500
    }
  }

  # check height is big enough 
  min_width = 450
  if (!is.data.frame(mutations)) { # no mutations
    min_height = 260
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
}


#' Function to check required inputs are present
#' 
#' @param clonal_prev -- clonal_prev provided by user
#' @param tree_edges -- tree_edges provided by user
checkRequiredInputs <- function(clonal_prev, tree_edges) {

  if (missing(clonal_prev)) {
    stop("Clonal prevalence data frame must be provided.")
  }
  if (missing(tree_edges)) {
    stop("Tree edge data frame must be provided.")
  }
}

#' check alpha value input is correct
#' 
#' @param alpha -- alpha provided by user
checkAlpha <- function(alpha) {
  if (!is.numeric(alpha)) {
    stop("Alpha value must be numeric.")
  }

  if (alpha < 0 || alpha > 100) {
    stop("Alpha value must be between 0 and 100.")
  }
}

#' check sort genotypes parameter input is correct
#' 
#' @param sort -- sort param provided by user
checkSort <- function(sort) {
  if (!is.logical(sort)) {
    stop("Sort parameter must be a boolean.")
  }
}

#' check clonal_prev parameter data
#'
#' @param clonal_prev -- clonal prevalence provided by user
checkClonalPrev <- function(clonal_prev) {

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

  return(clonal_prev)
}

#' check tree_edges parameter data
#'
#' @param tree_edges -- tree edges provided by user
checkTreeEdges <- function(tree_edges) {

  # ensure column names are correct
  if (!("source" %in% colnames(tree_edges)) ||
      !("target" %in% colnames(tree_edges))) {
    stop(paste("Tree edges data frame must have the following column names: ", 
        "\"source\", \"target\"", sep=""))
  }

  # ensure data is of the correct type
  tree_edges$source <- as.character(tree_edges$source)
  tree_edges$target <- as.character(tree_edges$target)

  # check for tree rootedness
  sources <- unique(tree_edges$source)
  targets <- unique(tree_edges$target)
  sources_for_iteration <- sources # because we will be changing the sources array over time
  for (i in 1:length(sources_for_iteration)) {
    cur_source <- sources_for_iteration[i]

    # if the source is a target, remove it from the sources list
    if (cur_source %in% targets) {
      sources <- sources[sources != cur_source]
    }
  }

  # if multiple roots are detected, throw error
  if (length(sources) > 1) {
    stop(paste("Multiple roots detected in tree (",paste(sources,collapse=", "),
      ") - tree must have only one root.",sep=""))
  }

  # if an edge is found whose source and target are equal, throw an error
  if (length(which(as.character(tree_edges$source) == as.character(tree_edges$target))) > 0) {
    stop("One of the tree edges has a source as its own target. Remove this edge.")
  }

  return(tree_edges)
}


#' check genotype_position parameter
#'
#' @param genotype_position -- genotype_position provided by user
checkGtypePositioning <- function(genotype_position) {
  if (!(genotype_position %in% c("stack", "centre", "space"))) {
    stop("Genotype position must be one of c(\"stack\", \"centre\", \"space\")")
  }
}

#' check clone_colours parameter
#'
#' @param clone_colours -- clone_colours provided by user
checkCloneColours <- function(clone_colours) {
  if (is.data.frame(clone_colours)) {

    # ensure column names are correct
    if (!("clone_id" %in% colnames(clone_colours)) ||
        !("colour" %in% colnames(clone_colours))) {
      stop(paste("Node colour data frame must have the following column names: ", 
          "\"clone_id\", \"colour\"", sep=""))
    }
  }
}

#' check perturbations parameter
#'
#' @param perturbations -- perturbations provided by user
checkPerts <- function(perturbations) {

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

  return(perturbations)
}

#' get mutation data
#'
#' @param mutations -- mutations data from user
#' @param tree_edges -- tree edges data from user
#' @param clonal_prev -- clonal prevalence data from user
getMutationsData <- function(mutations, tree_edges, clonal_prev) {

  if (is.data.frame(mutations)) {

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
    extra_columns <- colnames(mutations)[which(!(colnames(mutations) %in% c("chrom", "coord", "clone_id", "timepoint", "VAF")))]
    mutations <- data.frame(lapply(mutations, as.character), stringsAsFactors=FALSE)

    # check that all CLONE IDS in the mutations data are present in the tree data
    mutations_clone_ids <- unique(mutations$clone_id)
    tree_edges_clone_ids <- c(unique(tree_edges$source), unique(tree_edges$target))
    clone_ids_missing_from_tree_edges_data <- setdiff(mutations_clone_ids, tree_edges_clone_ids)
    if (length(clone_ids_missing_from_tree_edges_data) > 0) {
      stop(paste("The following clone ID(s) are present in the mutations data but ",
        "are missing from the tree edges data: ",
        paste(clone_ids_missing_from_tree_edges_data, collapse=", "), ".", sep=""))
    }

    # check that all TIMEPOINTS in the mutations data are present in the clonal prev data
    mutations_tps <- unique(mutations$timepoint)
    clonal_prev_tps <- unique(clonal_prev$timepoint)
    tps_missing_from_clonal_prev_data <- setdiff(mutations_tps, clonal_prev_tps)
    if (length(tps_missing_from_clonal_prev_data) > 0) {
      stop(paste("The following timepoint(s) are present in the mutations data but ",
        "are missing from the clonal prevalence data: ",
        paste(tps_missing_from_clonal_prev_data, collapse=", "), ".", sep=""))
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


    # get list of clones in the phylogeny
    clones_in_phylo <- unique(c(tree_edges$source, tree_edges$target))

    # keep only those mutations whose clone ids are present in the phylogeny
    mutations <- mutations[which(mutations$clone_id %in% clones_in_phylo),]

    # MUTATION PREVALENCES DATA

    mutation_prevalences <- mutations

    # keep only those mutations whose clone ids are present in the phylogeny
    mutation_prevalences <- mutation_prevalences[which(mutation_prevalences$clone_id %in% clones_in_phylo),]

    # warn if more than 10,000 rows in data that the visualization may be slow
    if (nrow(mutation_prevalences) > 10000 && show_warnings) {
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

  return(list("mutation_info"=mutation_info, "mutation_prevalences"=prevs_split_small))
}

#' function to replace spaces with underscores in all data frames & keep maps of original names to space-replaced names
#' @param clonal_prev -- clonal_prev data from user
#' @param tree_edges -- tree edges data from user
#' @param clone_colours -- clone_colours data from user
#' @param mutation_info -- processed mutation_info 
#' @param mutations -- mutations data from user
#' @param mutation_prevalences -- mutation_prevalences data from user
replaceSpaces <- function(clonal_prev, tree_edges, clone_colours, mutation_info, mutations, mutation_prevalences) {

  # create map of original sample ids to space-replaced sample ids
  timepoint_map <- data.frame(original_timepoint = unique(clonal_prev$timepoint), stringsAsFactors=FALSE)
  timepoint_map$space_replaced_timepoint <- stringr::str_replace_all(timepoint_map$original_timepoint,"\\s+","_")

  # create map of original clone ids to space-replaced clone ids
  clone_id_map <- data.frame(original_clone_id = unique(c(tree_edges$source, tree_edges$target)), stringsAsFactors=FALSE)
  clone_id_map$space_replaced_clone_id <- stringr::str_replace_all(clone_id_map$original_clone_id,"\\s+","_")

  # replace spaces with underscores
  # --> timepoints
  clonal_prev$timepoint <- stringr::str_replace_all(clonal_prev$timepoint,"\\s+","_")
  if (is.data.frame(mutations)) {
    mutation_prevalences <- lapply(mutation_prevalences, function(prevs) {
      prevs$timepoint <- stringr::str_replace_all(prevs$timepoint,"\\s+","_")
      return(prevs)
    })
  }
  # --> clone ids
  clonal_prev$clone_id <- stringr::str_replace_all(clonal_prev$clone_id,"\\s+","_")
  tree_edges$source <- stringr::str_replace_all(tree_edges$source,"\\s+","_")
  tree_edges$target <- stringr::str_replace_all(tree_edges$target,"\\s+","_")
  if (is.data.frame(clone_colours)) {
    clone_colours$clone_id <- stringr::str_replace_all(clone_colours$clone_id,"\\s+","_")
  }
  if (is.data.frame(mutations)) {
    mutation_info$clone_id <- stringr::str_replace_all(mutation_info$clone_id,"\\s+","_")
  }

  return(list("timepoint_map"=timepoint_map, 
              "clone_id_map"=clone_id_map, 
              "clonal_prev"=clonal_prev, 
              "tree_edges"=tree_edges,
              "mutation_info"=mutation_info,
              "clone_colours"=clone_colours,
              "mutation_prevalences"=mutation_prevalences))
}
