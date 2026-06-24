'use client'
import { Input } from '@/ui/web/components/input'
import { Label } from '@/ui/web/components/label'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export const Search: React.FC = () => {
  const [value, setValue] = useState('')
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const query = formData.get('search') as string
    router.push(`/search${query ? `?q=${query}` : ''}`)
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <Label htmlFor="search" className="sr-only">
          Search
        </Label>
        <Input
          id="search"
          name="search"
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
          }}
          placeholder="Search"
        />
        <button type="submit" className="sr-only">
          submit
        </button>
      </form>
    </div>
  )
}
