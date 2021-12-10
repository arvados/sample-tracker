#!/usr/bin/env python3

# Copyright (C) The Arvados Authors. All rights reserved.
#
# SPDX-License-Identifier: AGPL-3.0

import argparse
import csv
import arvados
import arvados.collection
from sample_tracker_terms import *

def import_patient(api, study, MRN):
    updateExisting = False
    patientResult = api.groups().list(filters=[["owner_uuid","=",study["uuid"]], ["properties.<"+sampleTrackerPatientMRN+">", "=", MRN]]).execute()
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
            sampleTrackerPatientMRN: MRN
        }
    }

    if updateExisting and patient:
        patient = api.groups().update(uuid=patient["uuid"], body={"group": fields}).execute()
    else:
        patient = api.groups().create(body={"group": fields}).execute()

    return patient

def patient_phi_collection(api, study, MRN):
    patient = import_patient(api, study, MRN)

    name = "Imported patient health records"

    col = api.collections().list(filters=[["owner_uuid", "=", patient["uuid"]],
                                           ["name", "=", name],
                                           ]).execute()
    if col["items"]:
        return col["items"][0]

    col = api.collections().create(body={"collection": {"owner_uuid": patient["uuid"],
                                                        "name": name}}).execute()

    return col


def main():

    parser = argparse.ArgumentParser()
    parser.add_argument('study_uuid', help='study uuid')

    args = parser.parse_args()

    api = arvados.api()

    patient_collections = {}

    study = api.groups().get(uuid=args.study_uuid).execute()
    with open("MM_ID_TO_MRN.csv", newline='') as csvfile:
        rdr = csv.DictReader(csvfile)
        for c in rdr:
            patient_collections[c["PatientID"]] = arvados.collection.Collection(patient_phi_collection(api, study, c["MRN"])["uuid"])


    tables = ["MM_PAT_COMORB.csv",
             "MM_PAT_DX_HISTORY.csv",
             "MM_PAT_ENC.csv",
             "MM_PAT_LAB.csv",
             "MM_PAT_LIST.csv",
             "MM_PAT_STATUS.csv",
             "MM_PAT_TX_HISTORY.csv",
             "MM_PAT_TX_SCT.csv"]

    for tab in tables:
        print("Importing", tab)
        count = 0
        openfiles = {}
        openwriters = {}
        header = None
        with open(tab, newline='') as csvfile:
            rdr = csv.reader(csvfile)
            for r in rdr:
                if header is None:
                    header = r
                    continue
                if r[0] in patient_collections:
                    if r[0] not in openfiles:
                        openfiles[r[0]] = patient_collections[r[0]].open(tab, "wt")
                        openwriters[r[0]] = csv.writer(openfiles[r[0]])
                        openwriters[r[0]].writerow(header)
                    openwriters[r[0]].writerow(r)
                    count += 1
                if (count % 1000) == 0:
                    print("processed", count, "rows")

        for op in openfiles:
            openfiles[op].close()

    for p in patient_collections:
        patient_collections[p].save()


main()
