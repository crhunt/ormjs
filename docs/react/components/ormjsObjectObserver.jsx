import { useState, useCallback } from 'react';
import styles from '../style/style.module.css';
import { useMutationObservable } from './elementObserver';

export function ORMJS_CountObjects({targetRef}) {

    const [objCount, setObjCount] = useState(0);
    const [entityCount, setEntityCount] = useState(0);
    const [valueCount, setValueCount] = useState(0);
    const [constraintCount, setConstraintCount] = useState(0);
    const [predCount, setPredCount] = useState(0);
    
    const onORMJSMutation = useCallback(
        (mutationList) => {
            let viewID = ORMJS_view_from_ref({targetRef});
            if (!viewID) return

            let objlist = {all:[], entity:[], value:[], 
                           constraint:[], predicate:[]};
            objlist.all = ormjs.Graph.any_object(viewID).objects_in_view();
            ["entity","value","constraint","predicate"].map( (type) => {
                objlist[type] = objlist.all.filter( (obj) => ( 
                    ormjs.Graph.any_object(obj) && 
                    ormjs.Graph.any_object(obj).kind == type
                ) );
            });
            setObjCount(objlist.all.length)
            setEntityCount(objlist.entity.length);
            setValueCount(objlist.value.length);
            setConstraintCount(objlist.constraint.length);
            setPredCount(objlist.predicate.length);
        },
        [setObjCount, setEntityCount, setValueCount, setConstraintCount, setPredCount]
    );

    useMutationObservable(targetRef.current, onORMJSMutation);

    return (
        <div className={styles.divSubcontainer}>
            <h4 className={styles.body}>React component uses MutationObserver to read ORMJS changes</h4>
            <p>Objects: {objCount}<br/>
               Entities: {entityCount}<br/>
               Values: {valueCount}<br/>
               Predicates: {predCount}<br/>
               Constraints: {constraintCount}</p>
        </div>
    )
}

export function ORMJS_CreateEntity({targetRef}) {

    function createEntityHandler() {
        let viewID = ORMJS_view_from_ref({targetRef});
        if (viewID) {
            new ormjs.Entity({x: 0, y: 0, view: viewID})
        }
    }

    return (
        <div className={styles.divSubcontainer}>
            <h4 className={styles.body}>React component uses ORMJS library to create entity</h4>
            <button onClick={createEntityHandler}>New Entity</button>
        </div>
    )
}

export function ORMJS_view_from_ref({targetRef}) {
    if(typeof ormjs != "undefined") { 
        let grandparent = targetRef.current;
        if(!grandparent) return null
        let viewID = grandparent.getElementsByTagName('svg')[0].id;
        return viewID
    }
    return null
}