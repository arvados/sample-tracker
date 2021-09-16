#!/usr/bin/env python3

# Copyright (C) The Arvados Authors. All rights reserved.
#
# SPDX-License-Identifier: AGPL-3.0

import argparse
import os
import arvados
import arvados.collection
import boto3
from sample_tracker_terms import *

def get_patient(arv, studyuuid, sample):
    sp = sample.split("_")
    studyprefix = sp[0]
    numeric_id = sp[1]
    patientid = "_".join((studyprefix,numeric_id))

    patientrecord = arv.groups().list(filters=[["owner_uuid", "=", studyuuid],
                                               ["name", "=", patientid],
                                               ["properties.type","=", sampleTrackerPatient]]).execute()
    if not patientrecord["items"]:
        return arv.groups().create(body={"group": {
            "group_class": "project",
            "owner_uuid": studyuuid,
            "name": patientid,
            "properties": {
                "type": sampleTrackerPatient
            }
        }}).execute()

    return patientrecord["items"][0]

def get_biopsy(arv, patientuuid, sample):
    sp = sample.split("_")
    studyprefix, numeric_id, collectionbiopsytype, timepoint, sampletype, aliquot = sample.split("_")
    biopsy = "_".join((studyprefix, numeric_id, collectionbiopsytype, timepoint))

    biopsyrecord = arv.groups().list(filters=[["properties.type", "=", sampleTrackerBiopsy],
                                              ["owner_uuid", "=", patientuuid],
                                              ["name", "=", biopsy]]).execute()
    if not biopsyrecord["items"]:
        if collectionbiopsytype.startswith("PB"):
            collection_type = PERIPHERAL_BLOOD
        elif collectionbiopsytype.startswith("BM"):
            collection_type = BONE_MARROW

        if collectionbiopsytype.endswith("T"):
            biopsy_type = TUMOR
        elif collectionbiopsytype.endswith("N"):
            biopsy_type = NORMAL

        return arv.groups().create(body={"group": {
            "owner_uuid": patientuuid,
            "group_class": "filter",
            "name": biopsy,
            "properties": {
                "filters": [["uuid", "is_a", "arvados#collection"],
                            ["collections.owner_uuid", "=", patient["uuid"]],
                            ["collections.name", "like", biopsy+"%"]],
                "type": sampleTrackerBiopsy,
                sampleTrackerBiopsyType: biopsy_type,
                sampleTrackerCollectionType: collection_type,
            }
        }}).execute()

    return biopsyrecord["items"][0]


def get_batch(arv, batchid):
    batchrecord = arv.groups().list(filters=[["properties.type", "=", sampleTrackerBatch],
                                              ["name", "=", batchid]]).execute()
    if not batchrecord["items"]:

        useruuid = arv.users().current().execute()["uuid"]

        batchProjects = arv.groups().list(filters=[["group_class", "=", "project"],
                                                   ["properties.type", "=", sampleTrackerBatchList]]).execute()
        writableProjects = list(filter(lambda f: useruuid in f["writable_by"], batchProjects["items"]))
        if len(writableProjects) == 0:
            prj = arv.groups().create(body={"group": {
                "group_class": "project",
                "name": "Batches",
                "properties": {
                    "type": sampleTrackerBatchList
                }
                }}).execute()
        else:
            prj = writableProjects[0]

        return arv.groups().create(body={"group": {
            "owner_uuid": prj["uuid"],
            "group_class": "filter",
            "name": batchid,
            "properties": {
                "filters": [["uuid", "is_a", "arvados#collection"],
                            ["collections.properties.type", "=", sampleTrackerSample],
                            ["collections.properties."+sampleTrackerBatchId, "=", batchid]],
                "type": sampleTrackerBatch
            }
        }}).execute()

    return batchrecord["items"][0]


def get_sample(arv, studyuuid, sample, batchid, lastmodified):
    samplerecord = arv.collections().list(filters=[["name", "=", sample], ["properties.type","=", sampleTrackerSample]]).execute()

    batch = get_batch(arv, batchid)

    if not samplerecord["items"]:
        patient = get_patient(arv, studyuuid, sample)
        biopsy = get_biopsy(arv, patient["uuid"], sample)

        studyprefix, numeric_id, collectionbiopsytype, timepoint, sampletype, aliquot = sample.split("_")

        return arv.collections().create(body={"collection": {
            "owner_uuid": patient["uuid"],
            "name": sample,
            "properties": {
                "type": sampleTrackerSample,
                sampleTrackerState: SEQUENCED,
                sampleTrackerSampleType: sampletype,
                sampleTrackerAliquot: int(aliquot),
                sampleTrackerBatchId: batchid,
                sampleTrackerSequencingCompletedAt: lastmodified.strftime("%Y-%m-%d")
            }
        }}).execute()

    samplerec = samplerecord["items"][0]

    prop = samplerec["properties"]
    prop[sampleTrackerState] = SEQUENCED
    prop[sampleTrackerBatchId] = batchid
    prop[sampleTrackerSequencingCompletedAt] = lastmodified.strftime("%Y-%m-%d")

    return arv.collections().update(
        uuid=samplerec["uuid"],
        body={"collection": {
            "properties": prop
    }}).execute()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('bucket', help='s3 bucket')
    parser.add_argument('study_uuid', help='study uuid')
    parser.add_argument('--s3-endpoint', help='optional S3 endpoint url')

    args = parser.parse_args()

    arv = arvados.api()

    session = boto3.session.Session()

    # 'https://172.17.0.2:9002'
    #'x2z00-gj3su-q4pzhh2vx2l7aid',
    #'4v2qk1hnnnp77st9z1zgmkocmqni26u2xaidrk714p56exwrfu'

    if not os.environ.get("S3_ACCESS_KEY_ID"):
        print("Missing environment variable S3_ACCESS_KEY_ID")
        exit()
    if not os.environ.get("S3_SECRET_ACCESS_KEY"):
        print("Missing environment variable S3_SECRET_ACCESS_KEY")
        exit()

    s3 = session.client(
        service_name='s3',
        aws_access_key_id=os.environ["S3_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["S3_SECRET_ACCESS_KEY"],
        endpoint_url=args.s3_endpoint,
        verify=False
    )

    # SEMA-MM-002DNA/MM_0011_PBN_01_DNA_01/MM_0011_PBN_01_DNA_01_L001_R1_001.fastq.gz

    #bucket = "x2z00-4zz18-suqsvm3b5i7r37l"
    bucket = args.bucket

    r = s3.list_objects_v2(Bucket=bucket)

    studyuuid = args.study_uuid

    studyrecord = arv.groups().get(uuid=studyuuid).execute()

    patientIdPrefix = studyrecord["properties"][sampleTrackerStudyPrefix]

    for c in r["Contents"]:
        s = c["Key"].split("/")
        if len(s) == 3 and s[2]:
            batch = s[0]
            sample = s[1]
            filename = s[2]

            obj = s3.get_object(Bucket=bucket, Key=c["Key"])

            samplerecord = get_sample(arv, studyuuid, sample, batch, obj["LastModified"])

            col = arvados.collection.Collection(samplerecord["uuid"])
            with col.open(filename, "wb") as f:
                blob = obj["Body"].read(65536)
                while blob:
                    f.write(blob)
                    blob = obj["Body"].read(65536)

            col.save()

main()
