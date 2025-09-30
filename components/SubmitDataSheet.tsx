
"use client"

function SubmitDataSheet() {

    const handleSubmit = (e:any)=>{
    e.preventDefault()
    const url = "https://script.google.com/macros/s/AKfycbwTJ6VutJGtLWfKdsTAuy8mdcpRI7ihBOopvn6hpQ4AiWvbkA9iOtd8TedLwdKk3dcJ/exec"
    fetch(url,{
      method:"POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:(`Name=${e.target.name.value}&Email=${e.target.email.value}`)
    }).then(res=>res.text()).then(data=>{
      alert(data)
    }).catch(error=>console.log(error))
  }


  return (
    <div className='min-h-screen pt-24 bg-gray-800 dark:bg-gray-900  flex flex-col items-center'>
        <h1 className="text-4xl uppercase mb-4 font-bold">React to Sheet</h1>
        <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4 border rounded space-y-4">
          <input name='name' placeholder='Name 1'  className="border p-2 w-full text-black rounded" />  
          <input name='email' placeholder='Email 1' className="border p-2 w-full text-black rounded" />  
          <button className="bg-blue-600 text-white px-4 py-2 rounded w-full hover:bg-blue-700 transition">Add</button>
        </form>
    </div>
  )

   
}

export default SubmitDataSheet