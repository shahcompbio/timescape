
TimeScape is a visualization tool for temporal clonal evolution.

# Installation 

To install TimeScape, type the following commands in R:


```r
# try http:// if https:// URLs are not supported
source("https://bioconductor.org/biocLite.R")
biocLite("timescape")
```

# Examples 

Run the examples by: 


```r
example("timescape")
```

The following visualizations will appear in your browser (optimized for Chrome):

The first visualization is of the acute myeloid leukemia patient from Ding et al., 2012.
The second visualization is of the metastatic ovarian cancer patient 7 from McPherson and Roth et al., 2016.


```
## Bioconductor version 3.4 (BiocInstaller 1.24.0), ?biocLite for help
```

```
## BioC_mirror: https://bioconductor.org
```

```
## Using Bioconductor 3.4 (BiocInstaller 1.24.0), R 3.3.2 (2016-10-31).
```

```
## Installing package(s) 'timescape'
```

```
## Warning: package 'timescape' is not available (for R version 3.3.2)
```
<!--html_preserve--><div id="htmlwidget-e86741a51c6058823f3d" style="width:900px;height:260px;" class="timescape html-widget"></div>
<script type="application/json" data-for="htmlwidget-e86741a51c6058823f3d">{"x":{"clonal_prev":[{"timepoint":"Diagnosis","clone_id":"1","clonal_prev":0.1274},{"timepoint":"Diagnosis","clone_id":"2","clonal_prev":0.5312},{"timepoint":"Diagnosis","clone_id":"3","clonal_prev":0.2904},{"timepoint":"Diagnosis","clone_id":"4","clonal_prev":0.051},{"timepoint":"Relapse","clone_id":"5","clonal_prev":1}],"gtype_tree_edges":[{"source":"1","target":"2"},{"source":"1","target":"3"},{"source":"3","target":"4"},{"source":"4","target":"5"}],"clone_cols":["NA"],"mutations":["NA"],"mutation_prevalences":["NA"],"mutations_provided":false,"xaxis_title":"Time Point","yaxis_title":"Clonal Prevalence","phylogeny_title":"Clonal Phylogeny","alpha":50,"genotype_position":"stack","perturbations":[{"pert_name":"Chemotherapy","prev_tp":"Diagnosis","frac":"0.1"}],"sort_gtypes":false,"timepoint_map":[{"original_timepoint":"Diagnosis","space_replaced_timepoint":"Diagnosis"},{"original_timepoint":"Relapse","space_replaced_timepoint":"Relapse"}],"clone_id_map":[{"original_clone_id":"1","space_replaced_clone_id":"1"},{"original_clone_id":"3","space_replaced_clone_id":"3"},{"original_clone_id":"4","space_replaced_clone_id":"4"},{"original_clone_id":"2","space_replaced_clone_id":"2"},{"original_clone_id":"5","space_replaced_clone_id":"5"}]},"evals":[],"jsHooks":[]}</script><!--/html_preserve-->


<!--html_preserve--><div id="htmlwidget-df180796d4b08c81e188" style="width:900px;height:260px;" class="timescape html-widget"></div>
<script type="application/json" data-for="htmlwidget-df180796d4b08c81e188">{"x":{"clonal_prev":[{"timepoint":"Intraperitoneal_diagnosis","clone_id":"A","clonal_prev":0.3732},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"B","clonal_prev":0.0072},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"C","clonal_prev":0.2571},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"D","clonal_prev":0.1107},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"E","clonal_prev":0.2519},{"timepoint":"Brain_metastasis","clone_id":"A","clonal_prev":0.0066},{"timepoint":"Brain_metastasis","clone_id":"B","clonal_prev":0.9921},{"timepoint":"Brain_metastasis","clone_id":"C","clonal_prev":0.0006},{"timepoint":"Brain_metastasis","clone_id":"D","clonal_prev":0.0004},{"timepoint":"Brain_metastasis","clone_id":"E","clonal_prev":0.0003},{"timepoint":"Intraperitoneal_relapse","clone_id":"A","clonal_prev":0.0077},{"timepoint":"Intraperitoneal_relapse","clone_id":"B","clonal_prev":0.0013},{"timepoint":"Intraperitoneal_relapse","clone_id":"C","clonal_prev":0.1737},{"timepoint":"Intraperitoneal_relapse","clone_id":"D","clonal_prev":0.8162},{"timepoint":"Intraperitoneal_relapse","clone_id":"E","clonal_prev":0.0012}],"gtype_tree_edges":[{"source":"A","target":"B"},{"source":"A","target":"C"},{"source":"C","target":"D"},{"source":"C","target":"E"}],"clone_cols":[{"clone_id":"A","colour":"d0ced0"},{"clone_id":"B","colour":"2CD0AB"},{"clone_id":"C","colour":"FFD94B"},{"clone_id":"D","colour":"FD8EE5"},{"clone_id":"E","colour":"F8766D"}],"mutations":["NA"],"mutation_prevalences":["NA"],"mutations_provided":false,"xaxis_title":"Time Point","yaxis_title":"Clonal Prevalence","phylogeny_title":"Clonal Phylogeny","alpha":15,"genotype_position":"stack","perturbations":["NA"],"sort_gtypes":false,"timepoint_map":[{"original_timepoint":"Intraperitoneal diagnosis","space_replaced_timepoint":"Intraperitoneal_diagnosis"},{"original_timepoint":"Brain metastasis","space_replaced_timepoint":"Brain_metastasis"},{"original_timepoint":"Intraperitoneal relapse","space_replaced_timepoint":"Intraperitoneal_relapse"}],"clone_id_map":[{"original_clone_id":"A","space_replaced_clone_id":"A"},{"original_clone_id":"C","space_replaced_clone_id":"C"},{"original_clone_id":"B","space_replaced_clone_id":"B"},{"original_clone_id":"D","space_replaced_clone_id":"D"},{"original_clone_id":"E","space_replaced_clone_id":"E"}]},"evals":[],"jsHooks":[]}</script><!--/html_preserve-->

# Required parameters 

The required parameters for TimeScape are as follows:

$clonal\_prev$ is a data frame consisting of clonal prevalences for each clone at each time point. The columns in this data frame are:

1. character() $timepoint$ - time point
2. character() $clone\_id$ - clone id
3. numeric() $clonal\_prev$ - clonal prevalence.

$tree\_edges$ is a data frame describing the edges of a rooted clonal phylogeny. The columns in this data frame are:

1. character() $source$ - source node id
2. character() $target$ - target node id.

# Optional parameters 

## Mutations 

$mutations$ is a data frame consisting of the mutations originating in each clone. The columns in this data frame are:

1. character() $chrom$ - chromosome number
2. numeric() $coord$ - coordinate of mutation on chromosome
3. character() $clone\_id$ - clone id
4. character() $timepoint$ - time point
5. numeric() $VAF$ - variant allele frequency of the mutation in the corresponding timepoint. 

If this parameter is provided, a mutation table will appear at the bottom of the view.

## Clone colours 

Clone colours may be changed using the $clone\_colours$ parameter, for instance, compare the default colours :

<!--html_preserve--><div id="htmlwidget-19bf6fa39504b0496a95" style="width:900px;height:260px;" class="timescape html-widget"></div>
<script type="application/json" data-for="htmlwidget-19bf6fa39504b0496a95">{"x":{"clonal_prev":[{"timepoint":"Intraperitoneal_diagnosis","clone_id":"A","clonal_prev":0.3732},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"B","clonal_prev":0.0072},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"C","clonal_prev":0.2571},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"D","clonal_prev":0.1107},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"E","clonal_prev":0.2519},{"timepoint":"Brain_metastasis","clone_id":"A","clonal_prev":0.0066},{"timepoint":"Brain_metastasis","clone_id":"B","clonal_prev":0.9921},{"timepoint":"Brain_metastasis","clone_id":"C","clonal_prev":0.0006},{"timepoint":"Brain_metastasis","clone_id":"D","clonal_prev":0.0004},{"timepoint":"Brain_metastasis","clone_id":"E","clonal_prev":0.0003},{"timepoint":"Intraperitoneal_relapse","clone_id":"A","clonal_prev":0.0077},{"timepoint":"Intraperitoneal_relapse","clone_id":"B","clonal_prev":0.0013},{"timepoint":"Intraperitoneal_relapse","clone_id":"C","clonal_prev":0.1737},{"timepoint":"Intraperitoneal_relapse","clone_id":"D","clonal_prev":0.8162},{"timepoint":"Intraperitoneal_relapse","clone_id":"E","clonal_prev":0.0012}],"gtype_tree_edges":[{"source":"A","target":"B"},{"source":"A","target":"C"},{"source":"C","target":"D"},{"source":"C","target":"E"}],"clone_cols":["NA"],"mutations":["NA"],"mutation_prevalences":["NA"],"mutations_provided":false,"xaxis_title":"Time Point","yaxis_title":"Clonal Prevalence","phylogeny_title":"Clonal Phylogeny","alpha":15,"genotype_position":"stack","perturbations":["NA"],"sort_gtypes":false,"timepoint_map":[{"original_timepoint":"Intraperitoneal diagnosis","space_replaced_timepoint":"Intraperitoneal_diagnosis"},{"original_timepoint":"Brain metastasis","space_replaced_timepoint":"Brain_metastasis"},{"original_timepoint":"Intraperitoneal relapse","space_replaced_timepoint":"Intraperitoneal_relapse"}],"clone_id_map":[{"original_clone_id":"A","space_replaced_clone_id":"A"},{"original_clone_id":"C","space_replaced_clone_id":"C"},{"original_clone_id":"B","space_replaced_clone_id":"B"},{"original_clone_id":"D","space_replaced_clone_id":"D"},{"original_clone_id":"E","space_replaced_clone_id":"E"}]},"evals":[],"jsHooks":[]}</script><!--/html_preserve-->

with specified custom colours:

<!--html_preserve--><div id="htmlwidget-b3a41be34d443f7665ac" style="width:900px;height:260px;" class="timescape html-widget"></div>
<script type="application/json" data-for="htmlwidget-b3a41be34d443f7665ac">{"x":{"clonal_prev":[{"timepoint":"Intraperitoneal_diagnosis","clone_id":"A","clonal_prev":0.3732},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"B","clonal_prev":0.0072},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"C","clonal_prev":0.2571},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"D","clonal_prev":0.1107},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"E","clonal_prev":0.2519},{"timepoint":"Brain_metastasis","clone_id":"A","clonal_prev":0.0066},{"timepoint":"Brain_metastasis","clone_id":"B","clonal_prev":0.9921},{"timepoint":"Brain_metastasis","clone_id":"C","clonal_prev":0.0006},{"timepoint":"Brain_metastasis","clone_id":"D","clonal_prev":0.0004},{"timepoint":"Brain_metastasis","clone_id":"E","clonal_prev":0.0003},{"timepoint":"Intraperitoneal_relapse","clone_id":"A","clonal_prev":0.0077},{"timepoint":"Intraperitoneal_relapse","clone_id":"B","clonal_prev":0.0013},{"timepoint":"Intraperitoneal_relapse","clone_id":"C","clonal_prev":0.1737},{"timepoint":"Intraperitoneal_relapse","clone_id":"D","clonal_prev":0.8162},{"timepoint":"Intraperitoneal_relapse","clone_id":"E","clonal_prev":0.0012}],"gtype_tree_edges":[{"source":"A","target":"B"},{"source":"A","target":"C"},{"source":"C","target":"D"},{"source":"C","target":"E"}],"clone_cols":[{"clone_id":"A","colour":"#e41a1c"},{"clone_id":"B","colour":"#377eb8"},{"clone_id":"C","colour":"#4daf4a"},{"clone_id":"D","colour":"#984ea3"},{"clone_id":"E","colour":"#ff7f00"}],"mutations":["NA"],"mutation_prevalences":["NA"],"mutations_provided":false,"xaxis_title":"Time Point","yaxis_title":"Clonal Prevalence","phylogeny_title":"Clonal Phylogeny","alpha":15,"genotype_position":"stack","perturbations":["NA"],"sort_gtypes":false,"timepoint_map":[{"original_timepoint":"Intraperitoneal diagnosis","space_replaced_timepoint":"Intraperitoneal_diagnosis"},{"original_timepoint":"Brain metastasis","space_replaced_timepoint":"Brain_metastasis"},{"original_timepoint":"Intraperitoneal relapse","space_replaced_timepoint":"Intraperitoneal_relapse"}],"clone_id_map":[{"original_clone_id":"A","space_replaced_clone_id":"A"},{"original_clone_id":"C","space_replaced_clone_id":"C"},{"original_clone_id":"B","space_replaced_clone_id":"B"},{"original_clone_id":"D","space_replaced_clone_id":"D"},{"original_clone_id":"E","space_replaced_clone_id":"E"}]},"evals":[],"jsHooks":[]}</script><!--/html_preserve-->

## Alpha value

The alpha value of each colour may be tweaked in the $alpha$ parameter (a numeric value between [0, 100]). Compare alpha of 10: 
<!--html_preserve--><div id="htmlwidget-5936ee19abc70e2195b5" style="width:900px;height:260px;" class="timescape html-widget"></div>
<script type="application/json" data-for="htmlwidget-5936ee19abc70e2195b5">{"x":{"clonal_prev":[{"timepoint":"Intraperitoneal_diagnosis","clone_id":"A","clonal_prev":0.3732},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"B","clonal_prev":0.0072},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"C","clonal_prev":0.2571},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"D","clonal_prev":0.1107},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"E","clonal_prev":0.2519},{"timepoint":"Brain_metastasis","clone_id":"A","clonal_prev":0.0066},{"timepoint":"Brain_metastasis","clone_id":"B","clonal_prev":0.9921},{"timepoint":"Brain_metastasis","clone_id":"C","clonal_prev":0.0006},{"timepoint":"Brain_metastasis","clone_id":"D","clonal_prev":0.0004},{"timepoint":"Brain_metastasis","clone_id":"E","clonal_prev":0.0003},{"timepoint":"Intraperitoneal_relapse","clone_id":"A","clonal_prev":0.0077},{"timepoint":"Intraperitoneal_relapse","clone_id":"B","clonal_prev":0.0013},{"timepoint":"Intraperitoneal_relapse","clone_id":"C","clonal_prev":0.1737},{"timepoint":"Intraperitoneal_relapse","clone_id":"D","clonal_prev":0.8162},{"timepoint":"Intraperitoneal_relapse","clone_id":"E","clonal_prev":0.0012}],"gtype_tree_edges":[{"source":"A","target":"B"},{"source":"A","target":"C"},{"source":"C","target":"D"},{"source":"C","target":"E"}],"clone_cols":["NA"],"mutations":["NA"],"mutation_prevalences":["NA"],"mutations_provided":false,"xaxis_title":"Time Point","yaxis_title":"Clonal Prevalence","phylogeny_title":"Clonal Phylogeny","alpha":10,"genotype_position":"stack","perturbations":["NA"],"sort_gtypes":false,"timepoint_map":[{"original_timepoint":"Intraperitoneal diagnosis","space_replaced_timepoint":"Intraperitoneal_diagnosis"},{"original_timepoint":"Brain metastasis","space_replaced_timepoint":"Brain_metastasis"},{"original_timepoint":"Intraperitoneal relapse","space_replaced_timepoint":"Intraperitoneal_relapse"}],"clone_id_map":[{"original_clone_id":"A","space_replaced_clone_id":"A"},{"original_clone_id":"C","space_replaced_clone_id":"C"},{"original_clone_id":"B","space_replaced_clone_id":"B"},{"original_clone_id":"D","space_replaced_clone_id":"D"},{"original_clone_id":"E","space_replaced_clone_id":"E"}]},"evals":[],"jsHooks":[]}</script><!--/html_preserve-->

with the alpha value of 90:
<!--html_preserve--><div id="htmlwidget-fa09c1f10dbdc1e1efa3" style="width:900px;height:260px;" class="timescape html-widget"></div>
<script type="application/json" data-for="htmlwidget-fa09c1f10dbdc1e1efa3">{"x":{"clonal_prev":[{"timepoint":"Intraperitoneal_diagnosis","clone_id":"A","clonal_prev":0.3732},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"B","clonal_prev":0.0072},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"C","clonal_prev":0.2571},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"D","clonal_prev":0.1107},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"E","clonal_prev":0.2519},{"timepoint":"Brain_metastasis","clone_id":"A","clonal_prev":0.0066},{"timepoint":"Brain_metastasis","clone_id":"B","clonal_prev":0.9921},{"timepoint":"Brain_metastasis","clone_id":"C","clonal_prev":0.0006},{"timepoint":"Brain_metastasis","clone_id":"D","clonal_prev":0.0004},{"timepoint":"Brain_metastasis","clone_id":"E","clonal_prev":0.0003},{"timepoint":"Intraperitoneal_relapse","clone_id":"A","clonal_prev":0.0077},{"timepoint":"Intraperitoneal_relapse","clone_id":"B","clonal_prev":0.0013},{"timepoint":"Intraperitoneal_relapse","clone_id":"C","clonal_prev":0.1737},{"timepoint":"Intraperitoneal_relapse","clone_id":"D","clonal_prev":0.8162},{"timepoint":"Intraperitoneal_relapse","clone_id":"E","clonal_prev":0.0012}],"gtype_tree_edges":[{"source":"A","target":"B"},{"source":"A","target":"C"},{"source":"C","target":"D"},{"source":"C","target":"E"}],"clone_cols":["NA"],"mutations":["NA"],"mutation_prevalences":["NA"],"mutations_provided":false,"xaxis_title":"Time Point","yaxis_title":"Clonal Prevalence","phylogeny_title":"Clonal Phylogeny","alpha":90,"genotype_position":"stack","perturbations":["NA"],"sort_gtypes":false,"timepoint_map":[{"original_timepoint":"Intraperitoneal diagnosis","space_replaced_timepoint":"Intraperitoneal_diagnosis"},{"original_timepoint":"Brain metastasis","space_replaced_timepoint":"Brain_metastasis"},{"original_timepoint":"Intraperitoneal relapse","space_replaced_timepoint":"Intraperitoneal_relapse"}],"clone_id_map":[{"original_clone_id":"A","space_replaced_clone_id":"A"},{"original_clone_id":"C","space_replaced_clone_id":"C"},{"original_clone_id":"B","space_replaced_clone_id":"B"},{"original_clone_id":"D","space_replaced_clone_id":"D"},{"original_clone_id":"E","space_replaced_clone_id":"E"}]},"evals":[],"jsHooks":[]}</script><!--/html_preserve-->

## Titles 

The x-axis, y-axis and phylogeny titles may be changed using the $xaxis\_title$, $yaxis\_title$ and $phylogeny\_title$ parameters, which take in a character string.

Here are some custom titles:
<!--html_preserve--><div id="htmlwidget-1dae7d09ff1dc898f695" style="width:900px;height:260px;" class="timescape html-widget"></div>
<script type="application/json" data-for="htmlwidget-1dae7d09ff1dc898f695">{"x":{"clonal_prev":[{"timepoint":"Intraperitoneal_diagnosis","clone_id":"A","clonal_prev":0.3732},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"B","clonal_prev":0.0072},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"C","clonal_prev":0.2571},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"D","clonal_prev":0.1107},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"E","clonal_prev":0.2519},{"timepoint":"Brain_metastasis","clone_id":"A","clonal_prev":0.0066},{"timepoint":"Brain_metastasis","clone_id":"B","clonal_prev":0.9921},{"timepoint":"Brain_metastasis","clone_id":"C","clonal_prev":0.0006},{"timepoint":"Brain_metastasis","clone_id":"D","clonal_prev":0.0004},{"timepoint":"Brain_metastasis","clone_id":"E","clonal_prev":0.0003},{"timepoint":"Intraperitoneal_relapse","clone_id":"A","clonal_prev":0.0077},{"timepoint":"Intraperitoneal_relapse","clone_id":"B","clonal_prev":0.0013},{"timepoint":"Intraperitoneal_relapse","clone_id":"C","clonal_prev":0.1737},{"timepoint":"Intraperitoneal_relapse","clone_id":"D","clonal_prev":0.8162},{"timepoint":"Intraperitoneal_relapse","clone_id":"E","clonal_prev":0.0012}],"gtype_tree_edges":[{"source":"A","target":"B"},{"source":"A","target":"C"},{"source":"C","target":"D"},{"source":"C","target":"E"}],"clone_cols":["NA"],"mutations":["NA"],"mutation_prevalences":["NA"],"mutations_provided":false,"xaxis_title":"My X Axis","yaxis_title":"My Y Axis","phylogeny_title":"My Phylogeny","alpha":15,"genotype_position":"stack","perturbations":["NA"],"sort_gtypes":false,"timepoint_map":[{"original_timepoint":"Intraperitoneal diagnosis","space_replaced_timepoint":"Intraperitoneal_diagnosis"},{"original_timepoint":"Brain metastasis","space_replaced_timepoint":"Brain_metastasis"},{"original_timepoint":"Intraperitoneal relapse","space_replaced_timepoint":"Intraperitoneal_relapse"}],"clone_id_map":[{"original_clone_id":"A","space_replaced_clone_id":"A"},{"original_clone_id":"C","space_replaced_clone_id":"C"},{"original_clone_id":"B","space_replaced_clone_id":"B"},{"original_clone_id":"D","space_replaced_clone_id":"D"},{"original_clone_id":"E","space_replaced_clone_id":"E"}]},"evals":[],"jsHooks":[]}</script><!--/html_preserve-->

## Genotype position

The position of each genotype with respect to its ancestor can be altered. The “stack” layout is the default layout. It stacks genotypes one on top of another to clearly display genotype prevalences at each time point. The “space” layout uses the same stacking method while maintaining (where possible) a minimum amount of space between each genotype. The “centre” layout centers genotypes with respect to their ancestors. Here we'll see an example of each:

### Stacked
<!--html_preserve--><div id="htmlwidget-78633157b48179c2341c" style="width:900px;height:260px;" class="timescape html-widget"></div>
<script type="application/json" data-for="htmlwidget-78633157b48179c2341c">{"x":{"clonal_prev":[{"timepoint":"Intraperitoneal_diagnosis","clone_id":"A","clonal_prev":0.3732},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"B","clonal_prev":0.0072},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"C","clonal_prev":0.2571},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"D","clonal_prev":0.1107},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"E","clonal_prev":0.2519},{"timepoint":"Brain_metastasis","clone_id":"A","clonal_prev":0.0066},{"timepoint":"Brain_metastasis","clone_id":"B","clonal_prev":0.9921},{"timepoint":"Brain_metastasis","clone_id":"C","clonal_prev":0.0006},{"timepoint":"Brain_metastasis","clone_id":"D","clonal_prev":0.0004},{"timepoint":"Brain_metastasis","clone_id":"E","clonal_prev":0.0003},{"timepoint":"Intraperitoneal_relapse","clone_id":"A","clonal_prev":0.0077},{"timepoint":"Intraperitoneal_relapse","clone_id":"B","clonal_prev":0.0013},{"timepoint":"Intraperitoneal_relapse","clone_id":"C","clonal_prev":0.1737},{"timepoint":"Intraperitoneal_relapse","clone_id":"D","clonal_prev":0.8162},{"timepoint":"Intraperitoneal_relapse","clone_id":"E","clonal_prev":0.0012}],"gtype_tree_edges":[{"source":"A","target":"B"},{"source":"A","target":"C"},{"source":"C","target":"D"},{"source":"C","target":"E"}],"clone_cols":["NA"],"mutations":["NA"],"mutation_prevalences":["NA"],"mutations_provided":false,"xaxis_title":"Time Point","yaxis_title":"Clonal Prevalence","phylogeny_title":"Clonal Phylogeny","alpha":15,"genotype_position":"stack","perturbations":["NA"],"sort_gtypes":false,"timepoint_map":[{"original_timepoint":"Intraperitoneal diagnosis","space_replaced_timepoint":"Intraperitoneal_diagnosis"},{"original_timepoint":"Brain metastasis","space_replaced_timepoint":"Brain_metastasis"},{"original_timepoint":"Intraperitoneal relapse","space_replaced_timepoint":"Intraperitoneal_relapse"}],"clone_id_map":[{"original_clone_id":"A","space_replaced_clone_id":"A"},{"original_clone_id":"C","space_replaced_clone_id":"C"},{"original_clone_id":"B","space_replaced_clone_id":"B"},{"original_clone_id":"D","space_replaced_clone_id":"D"},{"original_clone_id":"E","space_replaced_clone_id":"E"}]},"evals":[],"jsHooks":[]}</script><!--/html_preserve-->

### Spaced
<!--html_preserve--><div id="htmlwidget-6eed58988eae515c6314" style="width:900px;height:260px;" class="timescape html-widget"></div>
<script type="application/json" data-for="htmlwidget-6eed58988eae515c6314">{"x":{"clonal_prev":[{"timepoint":"Intraperitoneal_diagnosis","clone_id":"A","clonal_prev":0.3732},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"B","clonal_prev":0.0072},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"C","clonal_prev":0.2571},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"D","clonal_prev":0.1107},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"E","clonal_prev":0.2519},{"timepoint":"Brain_metastasis","clone_id":"A","clonal_prev":0.0066},{"timepoint":"Brain_metastasis","clone_id":"B","clonal_prev":0.9921},{"timepoint":"Brain_metastasis","clone_id":"C","clonal_prev":0.0006},{"timepoint":"Brain_metastasis","clone_id":"D","clonal_prev":0.0004},{"timepoint":"Brain_metastasis","clone_id":"E","clonal_prev":0.0003},{"timepoint":"Intraperitoneal_relapse","clone_id":"A","clonal_prev":0.0077},{"timepoint":"Intraperitoneal_relapse","clone_id":"B","clonal_prev":0.0013},{"timepoint":"Intraperitoneal_relapse","clone_id":"C","clonal_prev":0.1737},{"timepoint":"Intraperitoneal_relapse","clone_id":"D","clonal_prev":0.8162},{"timepoint":"Intraperitoneal_relapse","clone_id":"E","clonal_prev":0.0012}],"gtype_tree_edges":[{"source":"A","target":"B"},{"source":"A","target":"C"},{"source":"C","target":"D"},{"source":"C","target":"E"}],"clone_cols":["NA"],"mutations":["NA"],"mutation_prevalences":["NA"],"mutations_provided":false,"xaxis_title":"Time Point","yaxis_title":"Clonal Prevalence","phylogeny_title":"Clonal Phylogeny","alpha":15,"genotype_position":"space","perturbations":["NA"],"sort_gtypes":false,"timepoint_map":[{"original_timepoint":"Intraperitoneal diagnosis","space_replaced_timepoint":"Intraperitoneal_diagnosis"},{"original_timepoint":"Brain metastasis","space_replaced_timepoint":"Brain_metastasis"},{"original_timepoint":"Intraperitoneal relapse","space_replaced_timepoint":"Intraperitoneal_relapse"}],"clone_id_map":[{"original_clone_id":"A","space_replaced_clone_id":"A"},{"original_clone_id":"C","space_replaced_clone_id":"C"},{"original_clone_id":"B","space_replaced_clone_id":"B"},{"original_clone_id":"D","space_replaced_clone_id":"D"},{"original_clone_id":"E","space_replaced_clone_id":"E"}]},"evals":[],"jsHooks":[]}</script><!--/html_preserve-->

### Centered
<!--html_preserve--><div id="htmlwidget-0bf491b8d7ac69b5f1c9" style="width:900px;height:260px;" class="timescape html-widget"></div>
<script type="application/json" data-for="htmlwidget-0bf491b8d7ac69b5f1c9">{"x":{"clonal_prev":[{"timepoint":"Intraperitoneal_diagnosis","clone_id":"A","clonal_prev":0.3732},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"B","clonal_prev":0.0072},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"C","clonal_prev":0.2571},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"D","clonal_prev":0.1107},{"timepoint":"Intraperitoneal_diagnosis","clone_id":"E","clonal_prev":0.2519},{"timepoint":"Brain_metastasis","clone_id":"A","clonal_prev":0.0066},{"timepoint":"Brain_metastasis","clone_id":"B","clonal_prev":0.9921},{"timepoint":"Brain_metastasis","clone_id":"C","clonal_prev":0.0006},{"timepoint":"Brain_metastasis","clone_id":"D","clonal_prev":0.0004},{"timepoint":"Brain_metastasis","clone_id":"E","clonal_prev":0.0003},{"timepoint":"Intraperitoneal_relapse","clone_id":"A","clonal_prev":0.0077},{"timepoint":"Intraperitoneal_relapse","clone_id":"B","clonal_prev":0.0013},{"timepoint":"Intraperitoneal_relapse","clone_id":"C","clonal_prev":0.1737},{"timepoint":"Intraperitoneal_relapse","clone_id":"D","clonal_prev":0.8162},{"timepoint":"Intraperitoneal_relapse","clone_id":"E","clonal_prev":0.0012}],"gtype_tree_edges":[{"source":"A","target":"B"},{"source":"A","target":"C"},{"source":"C","target":"D"},{"source":"C","target":"E"}],"clone_cols":["NA"],"mutations":["NA"],"mutation_prevalences":["NA"],"mutations_provided":false,"xaxis_title":"Time Point","yaxis_title":"Clonal Prevalence","phylogeny_title":"Clonal Phylogeny","alpha":15,"genotype_position":"centre","perturbations":["NA"],"sort_gtypes":false,"timepoint_map":[{"original_timepoint":"Intraperitoneal diagnosis","space_replaced_timepoint":"Intraperitoneal_diagnosis"},{"original_timepoint":"Brain metastasis","space_replaced_timepoint":"Brain_metastasis"},{"original_timepoint":"Intraperitoneal relapse","space_replaced_timepoint":"Intraperitoneal_relapse"}],"clone_id_map":[{"original_clone_id":"A","space_replaced_clone_id":"A"},{"original_clone_id":"C","space_replaced_clone_id":"C"},{"original_clone_id":"B","space_replaced_clone_id":"B"},{"original_clone_id":"D","space_replaced_clone_id":"D"},{"original_clone_id":"E","space_replaced_clone_id":"E"}]},"evals":[],"jsHooks":[]}</script><!--/html_preserve-->

## Perturbations

Perturbations may be added to the TimeScape using the $perturbations$ parameter, which is a data frame consisting of the following columns:

1. character() $pert_name$ - the perturbation name
2. character() $prev_tp$ - the time point (as labelled in clonal prevalence data) BEFORE perturbation
3. numeric() $frac$ - the fraction of total tumour content remaining at the time of perturbation, range [0, 1].

### Without perturbation

<!--html_preserve--><div id="htmlwidget-9e562d8c7cd330b99e35" style="width:900px;height:260px;" class="timescape html-widget"></div>
<script type="application/json" data-for="htmlwidget-9e562d8c7cd330b99e35">{"x":{"clonal_prev":[{"timepoint":"Diagnosis","clone_id":"1","clonal_prev":0.1274},{"timepoint":"Diagnosis","clone_id":"2","clonal_prev":0.5312},{"timepoint":"Diagnosis","clone_id":"3","clonal_prev":0.2904},{"timepoint":"Diagnosis","clone_id":"4","clonal_prev":0.051},{"timepoint":"Relapse","clone_id":"5","clonal_prev":1}],"gtype_tree_edges":[{"source":"1","target":"2"},{"source":"1","target":"3"},{"source":"3","target":"4"},{"source":"4","target":"5"}],"clone_cols":["NA"],"mutations":["NA"],"mutation_prevalences":["NA"],"mutations_provided":false,"xaxis_title":"Time Point","yaxis_title":"Clonal Prevalence","phylogeny_title":"Clonal Phylogeny","alpha":50,"genotype_position":"stack","perturbations":["NA"],"sort_gtypes":false,"timepoint_map":[{"original_timepoint":"Diagnosis","space_replaced_timepoint":"Diagnosis"},{"original_timepoint":"Relapse","space_replaced_timepoint":"Relapse"}],"clone_id_map":[{"original_clone_id":"1","space_replaced_clone_id":"1"},{"original_clone_id":"3","space_replaced_clone_id":"3"},{"original_clone_id":"4","space_replaced_clone_id":"4"},{"original_clone_id":"2","space_replaced_clone_id":"2"},{"original_clone_id":"5","space_replaced_clone_id":"5"}]},"evals":[],"jsHooks":[]}</script><!--/html_preserve-->

### With perturbation (reduces the tumour to 10% of its original size)

<!--html_preserve--><div id="htmlwidget-15e95c2cd3c6b3bdeb23" style="width:900px;height:260px;" class="timescape html-widget"></div>
<script type="application/json" data-for="htmlwidget-15e95c2cd3c6b3bdeb23">{"x":{"clonal_prev":[{"timepoint":"Diagnosis","clone_id":"1","clonal_prev":0.1274},{"timepoint":"Diagnosis","clone_id":"2","clonal_prev":0.5312},{"timepoint":"Diagnosis","clone_id":"3","clonal_prev":0.2904},{"timepoint":"Diagnosis","clone_id":"4","clonal_prev":0.051},{"timepoint":"Relapse","clone_id":"5","clonal_prev":1}],"gtype_tree_edges":[{"source":"1","target":"2"},{"source":"1","target":"3"},{"source":"3","target":"4"},{"source":"4","target":"5"}],"clone_cols":["NA"],"mutations":["NA"],"mutation_prevalences":["NA"],"mutations_provided":false,"xaxis_title":"Time Point","yaxis_title":"Clonal Prevalence","phylogeny_title":"Clonal Phylogeny","alpha":50,"genotype_position":"stack","perturbations":[{"pert_name":"Chemotherapy","prev_tp":"Diagnosis","frac":"0.1"}],"sort_gtypes":false,"timepoint_map":[{"original_timepoint":"Diagnosis","space_replaced_timepoint":"Diagnosis"},{"original_timepoint":"Relapse","space_replaced_timepoint":"Relapse"}],"clone_id_map":[{"original_clone_id":"1","space_replaced_clone_id":"1"},{"original_clone_id":"3","space_replaced_clone_id":"3"},{"original_clone_id":"4","space_replaced_clone_id":"4"},{"original_clone_id":"2","space_replaced_clone_id":"2"},{"original_clone_id":"5","space_replaced_clone_id":"5"}]},"evals":[],"jsHooks":[]}</script><!--/html_preserve-->

# Obtaining the data 

E-scape takes as input a clonal phylogeny and clonal prevalences per clone per sample.  At the time of submission many methods have been proposed for obtaining these values, and accurate estimation of these quantities is the focus of ongoing research.  We describe a method for estimating clonal phylogenies and clonal prevalence using PyClone (Roth et al., 2014; source code available at https://bitbucket.org/aroth85/pyclone/wiki/Home) and citup (Malikic et al., 2016; source code available at https://github.com/sfu-compbio/citup).  In brief, PyClone inputs are prepared by processing fastq files resulting from a targeted deep sequencing experiment.  Using samtools mpileup (http://samtools.sourceforge.net/mpileup.shtml), the number of nucleotides matching the reference and non-reference are counted for each targeted SNV.  Copy number is also required for each SNV.  We recommend inferring copy number from whole genome or whole exome sequencing of samples taken from the same anatomic location / timepoint as the samples to which targeted deep sequencing was applied.  Copy number can be inferred using Titan (Ha et al., 2014; source code available at https://github.com/gavinha/TitanCNA).  Sample specific SNV information is compiled into a set of TSV files, one per sample.  The tables includes mutation id, reference and variant read counts, normal copy number, and major and minor tumour copy number (see PyClone readme).  PyClone is run on these files using the `PyClone run_analysis_pipeline` subcommand, and produces the `tables/cluster.tsv` in the working directory.  Citup can be used to infer a clonal phylogeny and clone prevalences from the cellular prevalences produced by PyClone.  The `tables/cluster.tsv` file contains per sample, per SNV cluster estimates of cellular prevalence.  The table is reshaped into a TSV file of cellular prevalences with rows as clusters and columns as samples, and the `mean` of each cluster taken from `tables/cluster.tsv` for the values of the table.  The iterative version of citup is run on the table of cellular frequencies, producing an hdf5 output results file.  Within the hdf5 results, the `/results/optimal` can be used to identify the id of the optimal tree solution.  The clonal phylogeny as an adjacency list is then the `/trees/{tree_solution}/adjacency_list` entry and the clone frequencies are the `/trees/{tree_solution}/clone_freq` entry in the hdf5 file.  The adjacency list can be written as a TSV with the column names `source`, `target` to be input into E-scape, and the clone frequencies should be reshaped such that each row represents a clonal frequency in a specific sample for a specific clone, with the columns representing the time or space ID, the clone ID, and the clonal prevalence.

# Interactivity

Interactive components: 

1. Mouseover any clone to view its (i) clone ID and (ii) clonal prevalence at each time point. 
2. Click the view switch button to switch from the traditional timescape view to the clonal trajectory view, where each clone changes prevalence on its own track. 
3. Click the download buttons to download a PNG or SVG of the view. 
4. If a mutation table is present, click a clone in the phylogeny to filter the mutation table by the selected clone.

# Documentation 

To view the documentation for TimeScape, type the following command in R:


```r
?timescape
```

or:


```r
browseVignettes("timescape") 
```

# References

TimeScape was developed at the Shah Lab for Computational Cancer Biology at the BC Cancer Research Centre.

References:

Ding, Li, et al. "Clonal evolution in relapsed acute myeloid leukaemia revealed by whole-genome sequencing." Nature 481.7382 (2012): 506-510.

Ha, Gavin, et al. "TITAN: inference of copy number architectures in clonal cell populations from tumor whole-genome sequence data." Genome research 24.11 (2014): 1881-1893.

Malikic, Salem, et al. "Clonality inference in multiple tumor samples using phylogeny." Bioinformatics 31.9 (2015): 1349-1356.

McPherson, Andrew, et al. "Divergent modes of clonal spread and intraperitoneal mixing in high-grade serous ovarian cancer." Nature genetics (2016).

Roth, Andrew, et al. "PyClone: statistical inference of clonal population structure in cancer." Nature methods 11.4 (2014): 396-398.
