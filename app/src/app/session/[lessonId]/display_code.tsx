// Overlay component that shows the join code in large text when state is true.
// Used for projector/display-mode presentation of the session PIN.
'use client';
import './display_code.css'

type Props = { 
  code: string | null,
  state: boolean 
}

/** Renders the join code overlay div; visible when state is true, hidden otherwise. */
export default function DisplayCodeState({ code, state } : Props) {
  if (!code) {
    console.log("Error: There is no code to display!")
    return
  }
  else {
    return (
      <div className={state ? 'display_code_component visible' : 'display_code_component'}>
        <h1 className='display_code_text'>Join Code: {code}</h1>
      </div>
    )
  }
}