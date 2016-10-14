## ---- eval=FALSE---------------------------------------------------------
#  install.packages("devtools") # if not already installed
#  library(devtools)
#  install_bitbucket("MO_BCCRC/timescape")
#  library(timescape)
#  example(timescape) # to run example

## ---- echo=FALSE---------------------------------------------------------
library(devtools)  
install_bitbucket("MO_BCCRC/timescape")  
library(timescape)  

## ---- echo=FALSE---------------------------------------------------------
# EXAMPLE 1 - Acute myeloid leukemia patient, Ding et al., 2012
# genotype tree edges
tree_edges <- read.csv(system.file("extdata", "AML_tree_edges.csv", package = "timescape"))
# clonal prevalences
clonal_prev <- read.csv(system.file("extdata", "AML_clonal_prev.csv", package = "timescape"))
# targeted mutations
mutations <- read.csv(system.file("extdata", "AML_mutations.csv", package = "timescape"))
# perturbations
perturbations <- data.frame( pert_name = c("Chemotherapy"), 
                             prev_tp = c("Diagnosis"),
                              frac = c(0.1))
# run timescape
timescape(clonal_prev = clonal_prev, tree_edges = tree_edges, perturbations = perturbations)

## ---- echo=FALSE---------------------------------------------------------
# EXAMPLE 2 - Patient 7, McPherson and Roth et al., 2016
# genotype tree edges
tree_edges <- read.csv(system.file("extdata", "px7_tree_edges.csv", package = "timescape"))
# clonal prevalences
clonal_prev <- read.csv(system.file("extdata", "px7_clonal_prev.csv", package = "timescape"))
# clone colours
clone_colours <- data.frame(clone_id = c("A","B","C","D","E"), 
                            colour = c("d0ced0", "2CD0AB", "FFD94B", "FD8EE5", "F8766D"))
# run timescape
timescape(clonal_prev = clonal_prev, tree_edges = tree_edges, clone_colours = clone_colours, height=260, alpha=15)

## ---- eval=FALSE---------------------------------------------------------
#  ?timescape

