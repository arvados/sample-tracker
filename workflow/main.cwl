cwlVersion: v1.2
class: Workflow
label: Example of an analysis workflow for the sample tracker.
inputs:
  projectUuid: string

steps:
  fetchData:
    in:
      projectUuid: projectUuid
    out: [fastq]
    run: fetch-data.cwl
  analyzeData:
    in:
      data: fetchData/fastq
    out: [results]
    run: analyze-data.cwl

outputs:
  result:
    type: File
    outputSource: analyzeData/results
