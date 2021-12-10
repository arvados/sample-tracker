#!/usr/bin/env python3

# Copyright (C) The Arvados Authors. All rights reserved.
#
# SPDX-License-Identifier: AGPL-3.0

import argparse
import csv
import arvados
from sample_tracker_terms import *

redcapSampleId = "sample_id"
redcapCollectedAt = "date_2"
redcapMRN = "mrn"
redcapPatientName = "patient_name"
redcapDOB = "dob"
redcapPhysician = "treating_physician"
redcapBoneMarrow = "sample_type_2___1"
redcapPeripheralBlood = "sample_type_2___2"

PERIPHERAL_BLOOD = "peripheral_blood",
BONE_MARROW = "bone_marrow"

TUMOR = "tumor",
NORMAL = "normal"

def import_patient(api, study, columns, updateExisting):
    patientResult = api.groups().list(filters=[["owner_uuid","=",study["uuid"]], ["properties.<"+sampleTrackerPatientMRN+">", "=", columns[redcapMRN]]]).execute()
    if patientResult["items"]:
        if updateExisting:
            patient = patientResult["items"][0]
        else:
            # Nothing to do
            return patientResult["items"][0]
    else:
        patient = None

    # new patient record
    if patient:
        pid = patient["name"]
    else:
        patients = api.groups().list(filters=[["owner_uuid","=",study["uuid"]], ["properties.type", "=", sampleTrackerPatient]], select=["uuid"]).execute()
        patientCount = patients["items_available"]
        pid = "{}_{:04}".format(study["properties"][sampleTrackerStudyPrefix], patientCount + 1)

    fields = {
        "name": pid,
        "owner_uuid": study["uuid"],
        "group_class": "project",
        "properties": {
            "type": sampleTrackerPatient,
            sampleTrackerPatientMRN: columns[redcapMRN],
            sampleTrackerPatientName: columns[redcapPatientName],
            sampleTrackerPatientDOB: columns[redcapDOB],
            sampleTrackerPatientPhysician: columns[redcapPhysician]
        }
    }

    if updateExisting and patient:
        patient = api.groups().update(uuid=patient["uuid"], body={"group": fields}).execute()
    else:
        patient = api.groups().create(body={"group": fields}).execute()

    return patient


def import_biopsies(api, patient, biopsies, updateExisting):

    existingRecords = api.groups().list(filters=[["owner_uuid","=",patient["uuid"]],
                                                 ["properties.type", "=", sampleTrackerBiopsy]]).execute()
    existingRecordsByRedcapId = {}

    timepoints = []

    for biopsy in existingRecords["items"]:
        if biopsy["properties"][sampleTrackerCollectedAt] not in timepoints:
            timepoints.append(biopsy["properties"][sampleTrackerCollectedAt])
        existingRecordsByRedcapId[biopsy["properties"][sampleTrackerBiopsyRedcapId]] = biopsy

    for biopsy in biopsies:
        if biopsy[redcapCollectedAt] not in timepoints:
            timepoints.append(biopsy[redcapCollectedAt])

    timepoints.sort()

    for biopsy in biopsies:
        if (biopsy[redcapSampleId] in existingRecordsByRedcapId) and not updateExisting:
            # Already loaded
            continue

        collectedAt = biopsy[redcapCollectedAt]
        timePoint = timepoints.index(collectedAt) + 1

        if biopsy[redcapBoneMarrow] == "1":
            collectionType = BONE_MARROW
            biopsyType = TUMOR
        elif biopsy[redcapPeripheralBlood] == "1":
            collectionType = PERIPHERAL_BLOOD
            biopsyType = NORMAL
        else:
            print("WARNING Skipping sample id {} because neither {} or {} are set".format(biopsy[redcapSampleId], redcapBoneMarrow, redcapPeripheralBlood))
            continue

        sampletype = ""
        if collectionType == BONE_MARROW:
            sampletype += "BM"
        elif collectionType == PERIPHERAL_BLOOD:
            sampletype += "PB"

        if biopsyType == TUMOR:
            sampletype += "T"
        elif biopsyType == NORMAL:
            sampletype += "N"

        bid = "{}_{}_{:02}".format(patient["name"], sampletype, timePoint)

        fields = {
            "owner_uuid": patient["uuid"],
            "name": bid,
            "group_class": "filter",
            "properties": {
                "type": sampleTrackerBiopsy,
                "filters": [["uuid", "is_a", "arvados#collection"],
                            ["collections.owner_uuid", "=", patient["uuid"]],
                            ["collections.name", "like", bid+"%"]],
                sampleTrackerCollectionType: collectionType,
                sampleTrackerBiopsyType: biopsyType,
                sampleTrackerCollectedAt: collectedAt,
                sampleTrackerTimePoint: timePoint,
                sampleTrackerBiopsyRedcapId: biopsy[redcapSampleId]
            }
        }

        if biopsy[redcapSampleId] in existingRecordsByRedcapId and updateExisting:
            api.groups().update(uuid=existingRecordsByRedcapId[biopsy[redcapSampleId]]["uuid"], body={"group": fields}).execute()
        else:
            api.groups().create(body={"group": fields}).execute()

    pass


def main():

    parser = argparse.ArgumentParser()
    parser.add_argument('study_uuid', help='study uuid')
    parser.add_argument('csvfile', help='csv file')

    args = parser.parse_args()

    api = arvados.api()

    study = api.groups().get(uuid=args.study_uuid).execute()

    biopsies = {}
    patients = {}

    updateExisting = True

    with open(args.csvfile, newline='') as csvfile:
        rdr = csv.DictReader(csvfile)
        for c in rdr:
            mrn = c[redcapMRN]
            biopsies.setdefault(mrn, [])
            biopsies[mrn].append(c)

            patient = import_patient(api, study, c, updateExisting)
            patients[mrn] = patient

    for mrn in patients:
        import_biopsies(api, patients[mrn], biopsies[mrn], updateExisting)


main()
