import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TextToImageForm } from '../TextToImageForm'

describe('TextToImageForm', () => {
  it('renders the form with placeholder text', () => {
    const onSubmit = vi.fn()
    render(<TextToImageForm onSubmit={onSubmit} />)

    expect(screen.getByPlaceholderText('Describe the image you want to generate...')).toBeInTheDocument()
  })

  it('submit button is disabled when prompt is empty', () => {
    const onSubmit = vi.fn()
    render(<TextToImageForm onSubmit={onSubmit} />)

    const submitButton = screen.getByRole('button', { name: '' }) // Arrow icon button
    expect(submitButton).toBeDisabled()
  })

  it('submit button is enabled when prompt has text', () => {
    const onSubmit = vi.fn()
    render(<TextToImageForm onSubmit={onSubmit} />)

    const textarea = screen.getByPlaceholderText('Describe the image you want to generate...')
    fireEvent.change(textarea, { target: { value: 'A beautiful sunset' } })

    const submitButton = screen.getByRole('button', { name: '' })
    expect(submitButton).not.toBeDisabled()
  })

  it('calls onSubmit with prompt when Shift+Enter is pressed', () => {
    const onSubmit = vi.fn()
    render(<TextToImageForm onSubmit={onSubmit} />)

    const textarea = screen.getByPlaceholderText('Describe the image you want to generate...')
    fireEvent.change(textarea, { target: { value: 'A beautiful sunset' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })

    expect(onSubmit).toHaveBeenCalledWith({
      prompts: ['A beautiful sunset'],
      outputSize: '1K',
      aspectRatio: '1:1',
      temperature: 1,
    })
  })

  it('does NOT submit when plain Enter is pressed', () => {
    const onSubmit = vi.fn()
    render(<TextToImageForm onSubmit={onSubmit} />)

    const textarea = screen.getByPlaceholderText('Describe the image you want to generate...')
    fireEvent.change(textarea, { target: { value: 'A beautiful sunset' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('is disabled when disabled prop is true', () => {
    const onSubmit = vi.fn()
    render(<TextToImageForm onSubmit={onSubmit} disabled />)

    const textarea = screen.getByPlaceholderText('Describe the image you want to generate...')
    expect(textarea).toBeDisabled()
  })
})
