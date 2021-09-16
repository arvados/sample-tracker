// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

# Clinical sample tracking plugin for Arvados Workbench 2

This is an example Arvados Workbench 2 plugin that adds a user
interface implementing a clinical sample tracking workflow.

## Features

* Track studies
* Track patients in studies
* Track biopies and associated DNA and RNA samples from patients
* Track samples as part of sequencer batches
* Start analysis workflow on samples

## Installing

1. Get the source for Workbench 2: https://git.arvados.org/arvados-workbench2.git/

github mirror: https://github.com/arvados/arvados-workbench2

2. Check out `sample-tracker` source and put it in `arvados-workbench2/src/plugins/sample-tracker`

3. Add the following code to `arvados-workbench2/src/plugins/plugins.tsx`

```
import { register as sampleTrackerPluginRegister } from 'plugins/sample-tracker/index';

sampleTrackerPluginRegister(pluginConfig);
```

4. Build a new Workbench 2

For testing/development: `yarn start`

For production: `make packages`

# Metadata format

Metadata is encoded in the naming scheme and `properties` of Arvados objects.

## Study

Arvados Project.  Represents the collected information associated with a study.

### type

sample_tracker:study

### sample_tracker:study_prefix

String.  New patient ids will be created with this prefix plus an underscore.

## Patient

Arvados Project.  Represents a patient participating in this study.  Part of (owner_uuid is) a Study.

Name format is `study_prefix + "_" + identifier`

### type

sample_tracker:patient

### sample_tracker:medical_record_number

String.  Medical record number for this patient.

### sample_tracker:patient_name

String.  Patient full name.

### sample_tracker:patient_date_of_birth

String.  Patient date of birth in YYYY-MM-DD format.

### sample_tracker:treating_physician

String.  Physician treating this patient.

## Biopsy

Arvados Filter group.  Represents a represents a biological sample taken from a patient.  Part of (owner_uuid is) a Patient.

Name format is `patient + "_" + collection_type + biopsy_type + "_" + time_point`
where `collection_type` is abbreviated to "PB" or "BM" and
`biopsy_type` is abbreviated to "T" or "N".

### type

sample_tracker:biopsy

### sample_tracker:collection_type

String. One of `peripheral_blood` or `bone_marrow`.

### sample_tracker:biopsy_type

String. One of `tumor` or `normal`.

### sample_tracker:collected_at

String. Biopsy collection date in YYYY-MM-DD format.

### sample_tracker:time_point

Integer.  Sequential time point of the biopsy.

### sample_tracker:biopsy_redcap_id

String. Id in external system used to correlate records during data import.

## Sample

Arvados Collection.  Represents a represents a biological sample will be or has been sequenced.  Part of (owner_uuid is) a Patient.

The collection contains the files with the sequencing results (e.g. the FASTQ files).

Name format is `biopsy + "_" + sample_type + "_" + aliquot`.

### type

sample_tracker:sample

### sample_tracker:sample_type

String.  One of

### sample_tracker:aliquot

Integer. The aliquot of sample.

### sample_tracker:sent_for_sequencing_at

String.  When the sample was sent for sequencing, in YYYY-MM-DD format.

### sample_tracker:sequencing_completed_at

String.  When sequencing was finished, in YYYY-MM-DD format.

### sample_tracker:state

String.  Processing state of the sample.  One of `NEW`,
`AT_SEQUENCING`, `SEQUENCED`, `SEQ_FAILED`, `ANALYSIS_COMPLETE`.

### sample_tracker:batch_id

String. The id of the sequencing batch this sample is part of.

## Batch

Filter group.  The filter matches samples that have the name of the filter group in the
property `sample_tracker:batch_id`.

### type

sample_tracker:batch
