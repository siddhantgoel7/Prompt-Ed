'use client';
import './display_code.css'

type Props = { 
  code: string | null,
  state: boolean 
}

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