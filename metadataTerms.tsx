// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

export const sampleTrackerBiopsy = "sample_tracker:biopsy";
export const sampleTrackerSample = "sample_tracker:sample";
export const sampleTrackerAliquot = "sample_tracker:aliquot";
export const sampleTrackerState = "sample_tracker:state";
export const sampleTrackerBiopsyRedcapId = "sample_tracker:biopsy_redcap_id";
export const sampleTrackerSampleType = "sample_tracker:sample_type";
export const sampleTrackerBatchId = "sample_tracker:batch_id";
export const sampleTrackerSampleUuid = "sample_tracker:sample_uuid";
export const sampleTrackerCollectionType = "sample_tracker:collection_type";
export const sampleTrackerBiopsyType = "sample_tracker:biopsy_type";
export const sampleTrackerCollectedAt = "sample_tracker:collected_at";
export const sampleTrackerTimePoint = "sample_tracker:time_point";
export const sampleTrackerBatch = "sample_tracker:batch";
export const sampleTrackerBatchList = "sample_tracker:batch_list";

export const sampleTrackerPatient = "sample_tracker:patient";
export const sampleTrackerPatientMRN = "sample_tracker:medical_record_number";
export const sampleTrackerPatientName = "sample_tracker:patient_name";
export const sampleTrackerPatientDOB = "sample_tracker:patient_date_of_birth";
export const sampleTrackerPatientPhysician = "sample_tracker:treating_physician";

export const sampleTrackerStudy = "sample_tracker:study";
export const sampleTrackerStudyPrefix = "sample_tracker:study_prefix";

export const sampleTrackerBiopsyUuid = "sample_tracker:biopsy_uuid";
export const sampleTrackerSentForSequencingAt = "sample_tracker:sent_for_sequencing_at";
export const sampleTrackerSequencingCompletedAt = "sample_tracker:sequencing_completed_at";

export enum CollectionType {
    PERIPHERAL_BLOOD = "peripheral_blood",
    BONE_MARROW = "bone_marrow"
}

export enum BiopsyType {
    TUMOR = "tumor",
    NORMAL = "normal"
}

export enum AnalysisState {
    NEW = "NEW",
    AT_SEQUENCING = "AT_SEQUENCING",
    SEQUENCED = "SEQUENCED",
    SEQ_FAILED = "SEQ_FAILED",
    ANALYSIS_COMPLETE = "ANALYSIS_COMPLETE"
}

export enum SampleType {
    DNA = "DNA",
    RNA = "RNA",
}
