cwlVersion: v1.2
class: CommandLineTool
inputs:
  data: File

$namespaces:
  arv: "http://arvados.org/cwl#"
requirements:
  arv:APIRequirement: {}

stdout: results.txt
arguments: [md5sum, $(inputs.data)]
outputs:
  results: stdout
