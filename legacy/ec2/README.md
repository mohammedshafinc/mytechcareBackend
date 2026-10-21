# NOT ACTIVE — DO NOT DEPLOY

This directory is retained only as historical evidence of the suspended EC2/PostgreSQL/Nest deployment. It is not built, tested, supported, or used by the Cloudflare Worker. Do not run the Docker workflow, compose file, PostgreSQL migrations, or Nest entry point. Active deployment instructions are in `../../docs/cloudflare-deployment.md`.

No AWS resource is modified or deleted by this repository migration. AWS is not the rollback target because the user chose a fresh D1 database.
