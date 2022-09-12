import { useState, useCallback, useRef } from 'react';
import styles from '../style/style.module.css';
import { ORMJS_view_from_ref } from './ormjsObjectObserver';
import { useMutationObservable } from './elementObserver';

export function ORMJS_HighlightOnClick({targetRef}) {

    const [highlight, setHighlight] = useState(false);
    let buttonRef = useRef();

    const onORMJSMutation = useCallback(
        (mutationList) => {
            /* I want to read the state of highlight, but haven't figured out how
               to pass it. (Passing directly doesn't get updated.) */
            let newhighlight = false;
            if (buttonRef.current.innerHTML === "No Highlight") {
                newhighlight = true;
            }
            let viewID = ORMJS_view_from_ref({targetRef});
            if (!viewID) return
            ORMJS_highlight_on_click({viewID, highlight: newhighlight});
        },
        [buttonRef]
    );

    useMutationObservable(targetRef.current, onORMJSMutation);

    function clickHandler() {
        highlight ? setHighlight(false) : setHighlight(true);
        let viewID = ORMJS_view_from_ref({targetRef});
        if (viewID) {
            ORMJS_highlight_on_click({viewID: viewID, highlight: !highlight});
        }
    }

    let button_text = "No Highlight";
    if (!highlight) {
        button_text = "Highlight";
    }
    return (
    <div className={styles.divSubcontainer}>
        <h4 className={styles.body}>React component causes ORMJS objects to highlight on click</h4>
        <p>This component illustrates how to use React to change ORMJS interaction.</p>
        <p>While here we trigger the change with a button, React's "useEffect" capability 
        can apply the changes after render as well.</p>
        <button ref={buttonRef} onClick={clickHandler}>{button_text}</button>
    </div>
    )
}

function ORMJS_highlight_on_click({viewID, highlight}) {

    let objlist = ormjs.Graph.any_object(viewID).objects_in_view();
    if (highlight) {
        objlist.map( (id) => {
            function onClick() {
                ormjs.Graph.class_as(id, "ormjs-selected");
            }
            ormjs.Graph.any_object(id).d3object.on("click", onClick);
        });
    } else {
        objlist.map( (id) => {
            ormjs.Graph.any_object(id).d3object.on("click", null);
        });
    }
}