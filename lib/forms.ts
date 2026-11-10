import { startTransition, type FormEvent } from "react";

/**
 * onSubmit handler that dispatches a useActionState action WITHOUT React's
 * automatic form reset.
 *
 * With `<form action={fn}>`, React 19 resets the form after the action
 * finishes, even when it returns validation errors. Controlled inputs then
 * keep their state but the browser field is emptied (seen in WebKit/iPhone
 * Safari), so people lose what they typed. Dispatching in a transition
 * from onSubmit keeps the fields as they are.
 */
export function submitWithoutReset(dispatch: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };
}
