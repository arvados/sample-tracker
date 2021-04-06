import sys
import arvados

api = arvados.api()

sampleproj = api.groups().get(uuid=sys.argv[1]).execute()
print("Sample is %s" % (sampleproj["name"]))

patientproj = api.groups().get(uuid=sampleproj["owner_uuid"]).execute()
print("Patient is %s" % (patientproj["name"]))

# Create an fake empty fastq file
open("fake_data.fastq", "w")
