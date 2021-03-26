# Sample tracking plugin for Arvados Workbench 2

## Installing

1. Get the source for Workbench 2

https://git.arvados.org/arvados-workbench2.git/

2. Check out `sample-tracker` source and put it in `arvados-workbench2/src/plugins/sample-tracker`

3. Add the following code to `arvados-workbench2/src/plugins/plugins.tsx`

```
import { register as sampleTrackerPluginRegister } from '~/plugins/sample-tracker/index';
sampleTrackerPluginRegister(pluginConfig);
```

4. Build a new Workbench 2

For testing/development: `yarn start`

For production: `make packages`
