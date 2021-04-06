cwlVersion: v1.2
class: CommandLineTool
inputs:
  projectUuid: string
  script:
    type: File
    default:
      class: File
      location: fetch_data.py

$namespaces:
  arv: "http://arvados.org/cwl#"
requirements:
  arv:APIRequirement: {}
  DockerRequirement:
    dockerPull: arvados/jobs

arguments: [python3, $(inputs.script), $(inputs.projectUuid)]
outputs:
  fastq:
    type: File
    outputBinding:
      glob: "*.fastq"
