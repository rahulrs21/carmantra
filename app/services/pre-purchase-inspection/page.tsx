import FormDataEmail from '@/components/FormDataEmail'
import SubmitDataSheet from '@/components/SubmitDataSheet'
import { Sub } from '@radix-ui/react-context-menu'
import React from 'react'
import { Form } from 'react-hook-form'

function PrePageInspection() {
  return (
    <div className='min-h-screen pt-24 bg-gray-800 dark:bg-gray-900 text-white flex flex-col items-center'>

      <FormDataEmail />
      
    <SubmitDataSheet />

    </div>
  )
}

export default PrePageInspection