import * as React from 'react';
import { RootState } from '~/store/store';
import { ContainerResource } from "~/models/container";
import { ContainerRequestResource } from "~/models/container-request";
import { openRunProcess } from '~/store/workflow-panel/workflow-panel-actions';
import { navigateTo } from '~/store/navigation/navigation-action';
import { Button } from '@material-ui/core';
import { getResource } from "~/store/resources/resources";
import { getProperty } from '~/store/properties/properties';
import { DispatchProp, connect } from 'react-redux';
import { PropertiedResource } from "./resource-component";

export const RunProcessComponent = connect((state: RootState, props: { resource: PropertiedResource, lookupProperty: string, workflowToRun: string }) => {
    const samplesToWf = getProperty<{ [key: string]: ContainerRequestResource | undefined }>(props.lookupProperty)(state.properties);
    let containerRequest: ContainerRequestResource | undefined;
    let container: ContainerResource | undefined;
    if (samplesToWf) {
        containerRequest = samplesToWf[props.resource.uuid];
        if (containerRequest && containerRequest.containerUuid) {
            container = getResource<ContainerResource>(containerRequest.containerUuid)(state.resources);
        }
    }
    return {
        containerRequest,
        container,
        ...props
    };
})((props: {
    containerRequest: ContainerRequestResource | undefined,
    container: ContainerResource | undefined,
    resource: PropertiedResource,
    workflowToRun: string
} & DispatchProp<any>) => {
    if (props.containerRequest && props.container) {
        if (props.container.state === "Failed") {
            return <>
                <Button onClick={() => props.dispatch<any>(navigateTo(props.containerRequest!.uuid))}>{props.container.state}</Button>
                <Button onClick={() => props.dispatch<any>(openRunProcess(props.workflowToRun,
                    props.resource.uuid,
                    `Analysis of ${props.resource.name}`,
                    { "#main/projectUuid": props.resource.uuid }))}>Start analysis</Button>
            </>;
        } else {
            return <Button onClick={() => props.dispatch<any>(navigateTo(props.containerRequest!.uuid))}>{props.container.state}</Button>;
        }
    } else {
        return <Button onClick={() => props.dispatch<any>(openRunProcess(props.workflowToRun,
            props.resource.uuid,
            `Analysis of ${props.resource.name}`,
            { "#main/projectUuid": props.resource.uuid }))}>Start analysis</Button>;
    }
});
