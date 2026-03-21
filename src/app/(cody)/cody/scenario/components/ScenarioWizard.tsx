/**
 * @fileType component
 * @domain cody
 * @pattern scenario-wizard
 * @ai-summary 4-step wizard for creating scenarios: Name → Prototype → Steps → Save
 */
'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/ui/web/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/web/components/card'
import { Input } from '@/ui/web/components/input'
import { Label } from '@/ui/web/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/web/components/select'
import { Badge } from '@/ui/web/components/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/web/components/dialog'
import { PrototypePanel } from './PrototypePanel'
import { DesignSystemPanel } from './DesignSystemPanel'
import type { Scenario, DSComponent, PrototypeElement } from '@/infra/qa/schema'
import { toast } from 'sonner'
import { Check, ChevronLeft, ChevronRight, Save, Github, Download } from 'lucide-react'

type WizardStep = 'name' | 'prototype' | 'steps' | 'save'

const STEPS: { id: WizardStep; label: string; description: string }[] = [
  { id: 'name', label: 'Name', description: 'Name your scenario' },
  { id: 'prototype', label: 'Prototype', description: 'Select a prototype' },
  { id: 'steps', label: 'Steps', description: 'Add test steps' },
  { id: 'save', label: 'Save', description: 'Preview and export' },
]

interface ScenarioWizardProps {
  initialScenario?: Partial<Scenario>
}

export function ScenarioWizard({ initialScenario }: ScenarioWizardProps) {
  // Current step
  const [currentStep, setCurrentStep] = useState<WizardStep>('name')

  // Scenario state
  const [scenario, setScenario] = useState<Partial<Scenario>>({
    id: '',
    name: '',
    type: 'feature',
    steps: [],
    status: 'draft',
    ...initialScenario,
  })

  // Selection state
  const [selectedPrototype, setSelectedPrototype] = useState<string | null>(null)
  const [selectedElements, setSelectedElements] = useState<PrototypeElement[]>([])
  const [selectedComponents, setSelectedComponents] = useState<DSComponent[]>([])

  // UI state
  const [showPRDDialog, setShowPRDDialog] = useState(false)

  // Step navigation
  const stepIndex = STEPS.findIndex((s) => s.id === currentStep)
  const canGoBack = stepIndex > 0
  const canGoForward = stepIndex < STEPS.length - 1

  const goNext = useCallback(() => {
    if (currentStep === 'name' && !scenario.name) {
      toast.error('Please enter a scenario name')
      return
    }
    if (canGoForward) {
      setCurrentStep(STEPS[stepIndex + 1].id)
    }
  }, [currentStep, scenario.name, canGoForward, stepIndex])

  const goBack = useCallback(() => {
    if (canGoBack) {
      setCurrentStep(STEPS[stepIndex - 1].id)
    }
  }, [canGoBack, stepIndex])

  const goToStep = useCallback(
    (step: WizardStep) => {
      // Can always go back, can go forward if name is set
      const targetIndex = STEPS.findIndex((s) => s.id === step)
      if (targetIndex < stepIndex) {
        setCurrentStep(step)
      } else if (targetIndex > stepIndex && scenario.name) {
        setCurrentStep(step)
      } else if (scenario.name) {
        setCurrentStep(step)
      }
    },
    [stepIndex, scenario.name],
  )

  // Handlers
  const handleNameChange = useCallback((name: string) => {
    setScenario((prev) => ({
      ...prev,
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
    }))
  }, [])

  const handleTypeChange = useCallback((type: 'core' | 'feature' | 'edge') => {
    setScenario((prev) => ({ ...prev, type }))
  }, [])

  const handleElementSelect = useCallback((element: PrototypeElement) => {
    setSelectedElements((prev) => {
      const exists = prev.some((e) => e.id === element.id)
      if (exists) {
        return prev.filter((e) => e.id !== element.id)
      }
      return [...prev, element]
    })
  }, [])

  const handleComponentSelect = useCallback((component: DSComponent) => {
    setSelectedComponents((prev) => {
      const exists = prev.some((c) => c.name === component.name)
      if (exists) {
        return prev.filter((c) => c.name !== component.name)
      }
      return [...prev, component]
    })
  }, [])

  const handleAddStep = useCallback(
    (step: { type: string; action: string; target: string; component?: string }) => {
      setScenario((prev) => ({
        ...prev,
        steps: [
          ...(prev.steps || []),
          {
            type: step.type as 'given' | 'when' | 'then' | 'and' | 'but',
            action: step.action,
            target: step.target,
            component: step.component,
          },
        ],
      }))
    },
    [],
  )

  const handleRemoveStep = useCallback((index: number) => {
    setScenario((prev) => ({
      ...prev,
      steps: prev.steps?.filter((_, i) => i !== index),
    }))
  }, [])

  const handleSaveScenario = useCallback(async () => {
    if (!scenario.id || !scenario.name) {
      toast.error('Please enter a scenario name')
      return
    }

    try {
      const response = await fetch('/api/cody/scenario/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: {
            ...scenario,
            status: 'draft',
            createdAt: new Date().toISOString(),
          },
          category: scenario.type || 'feature',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      toast.success(`Scenario "${scenario.name}" saved`)
    } catch (error) {
      toast.error('Failed to save scenario')
      console.error(error)
    }
  }, [scenario])

  const handleCreateGitHubIssue = useCallback(async () => {
    if (!scenario.name || !scenario.steps?.length) {
      toast.error('Please add name and steps first')
      return
    }

    try {
      const response = await fetch('/api/cody/scenario/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: scenario.name,
          category: scenario.type || 'feature',
          area: scenario.area,
          scenario: scenario.steps.map((s) => `${s.type}: ${s.action} ${s.target}`).join('\n'),
          prototype: selectedPrototype,
          fixture: scenario.fixture,
          behaviors: scenario.siteBehaviors,
          dsComponents: selectedComponents.map((c) => c.name),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create issue')
      }

      const data = await response.json()
      toast.success(`GitHub issue #${data.number} created`)
      setShowPRDDialog(false)
    } catch (error) {
      toast.error('Failed to create GitHub issue')
      console.error(error)
    }
  }, [scenario, selectedPrototype, selectedComponents])

  const handleExport = async (format: 'qa' | 'playwright' | 'prd') => {
    if (!scenario.id || !scenario.name) {
      toast.error('Please name your scenario first')
      return
    }

    try {
      const response = await fetch('/api/cody/scenario/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: {
            ...scenario,
            steps: scenario.steps?.map((s) => ({
              type: s.type,
              action: s.action,
              target: s.target,
            })),
          },
          format,
        }),
      })

      if (!response.ok) throw new Error('Export failed')

      const data = await response.json()

      if (format === 'playwright') {
        const blob = new Blob([data.data], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${scenario.id}.spec.ts`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Playwright test downloaded')
      } else if (format === 'qa') {
        await navigator.clipboard.writeText(JSON.stringify(data.data, null, 2))
        toast.success('QA format copied to clipboard')
      } else {
        await navigator.clipboard.writeText(JSON.stringify(data.data, null, 2))
        toast.success('PRD data copied to clipboard')
      }
    } catch (error) {
      toast.error('Export failed')
      console.error(error)
    }
  }

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'name':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Name Your Scenario</h2>
              <p className="text-muted-foreground">
                Give your scenario a clear, descriptive name that explains what user flow it tests.
              </p>
            </div>

            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="scenario-name">Scenario Name</Label>
                <Input
                  id="scenario-name"
                  placeholder="e.g., Student solves MCQ question correctly"
                  value={scenario.name || ''}
                  onChange={(e) => handleNameChange(e.target.value)}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  This will be used as the title when creating GitHub issues
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scenario-type">Scenario Type</Label>
                <Select
                  value={scenario.type}
                  onValueChange={(v) => handleTypeChange(v as 'core' | 'feature' | 'edge')}
                >
                  <SelectTrigger id="scenario-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="core">
                      <div>
                        <div className="font-medium">Core</div>
                        <div className="text-xs text-muted-foreground">Critical user flows</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="feature">
                      <div>
                        <div className="font-medium">Feature</div>
                        <div className="text-xs text-muted-foreground">Specific functionality</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="edge">
                      <div>
                        <div className="font-medium">Edge Case</div>
                        <div className="text-xs text-muted-foreground">Boundary conditions</div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )

      case 'prototype':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Select a Prototype</h2>
              <p className="text-muted-foreground">
                Choose an HTML prototype to extract elements from, or browse design system
                components.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">HTML Prototype</CardTitle>
                </CardHeader>
                <CardContent>
                  <PrototypePanel
                    selectedElements={selectedElements}
                    onElementSelect={handleElementSelect}
                    selectedPrototype={selectedPrototype}
                    onPrototypeSelect={setSelectedPrototype}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Design System</CardTitle>
                </CardHeader>
                <CardContent>
                  <DesignSystemPanel
                    selectedComponents={selectedComponents}
                    onComponentSelect={handleComponentSelect}
                  />
                </CardContent>
              </Card>
            </div>

            {(selectedElements.length > 0 || selectedComponents.length > 0) && (
              <div className="p-4 bg-muted rounded-lg">
                <Label className="text-sm font-medium mb-2 block">
                  Selected ({selectedElements.length + selectedComponents.length})
                </Label>
                <div className="flex flex-wrap gap-2">
                  {selectedElements.map((el) => (
                    <Badge key={el.id} variant="secondary">
                      {el.tag}
                      {el.idAttr && ` #${el.idAttr}`}
                    </Badge>
                  ))}
                  {selectedComponents.map((c) => (
                    <Badge key={c.name} variant="outline">
                      {c.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )

      case 'steps':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Add Test Steps</h2>
              <p className="text-muted-foreground">
                Build your scenario using Gherkin-style steps (Given/When/Then).
              </p>
            </div>

            <StepsBuilder
              selectedElements={selectedElements}
              selectedComponents={selectedComponents}
              onAddStep={handleAddStep}
            />

            {/* Steps List */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Scenario Steps ({scenario.steps?.length || 0})
              </Label>
              {scenario.steps && scenario.steps.length > 0 ? (
                <div className="space-y-2">
                  {scenario.steps.map((step, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono opacity-60">{index + 1}.</span>
                        <Badge variant="outline" className="font-normal">
                          {step.type}
                        </Badge>
                        <span className="font-medium">{step.action}</span>
                        <span className="text-muted-foreground">{step.target}</span>
                        {step.component && (
                          <Badge variant="secondary" className="text-xs">
                            → {step.component}
                          </Badge>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveStep(index)}>
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">
                  No steps yet. Use the builder above to add steps.
                </p>
              )}
            </div>
          </div>
        )

      case 'save':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Preview & Save</h2>
              <p className="text-muted-foreground">
                Review your scenario and choose how to proceed.
              </p>
            </div>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{scenario.name || 'Untitled Scenario'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 text-sm">
                  <Badge variant="outline">{scenario.type || 'feature'}</Badge>
                  {selectedPrototype && (
                    <span className="text-muted-foreground">Prototype: {selectedPrototype}</span>
                  )}
                  <span className="text-muted-foreground">{scenario.steps?.length || 0} steps</span>
                </div>

                {scenario.steps && scenario.steps.length > 0 && (
                  <div className="space-y-1">
                    {scenario.steps.map((step, index) => (
                      <div key={index} className="text-sm">
                        <Badge variant="outline" className="mr-2 text-xs">
                          {step.type}
                        </Badge>
                        {step.action} <span className="text-muted-foreground">{step.target}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSaveScenario} disabled={!scenario.name}>
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button variant="outline" onClick={() => setShowPRDDialog(true)}>
                <Github className="h-4 w-4 mr-2" />
                Create GitHub Issue
              </Button>
              <Button variant="outline" onClick={() => handleExport('playwright')}>
                <Download className="h-4 w-4 mr-2" />
                Export Playwright
              </Button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-4">
          <h1 className="text-2xl font-bold">Create Scenario</h1>
        </div>
      </header>

      {/* Step Indicator */}
      <div className="border-b bg-muted/30">
        <div className="container py-4">
          <div className="flex items-center justify-center gap-2">
            {STEPS.map((step, index) => (
              <button
                key={step.id}
                onClick={() => goToStep(step.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                  step.id === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : index < stepIndex
                      ? 'bg-muted hover:bg-muted/80 cursor-pointer'
                      : 'opacity-50'
                }`}
              >
                {index < stepIndex ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="h-5 w-5 rounded-full border flex items-center justify-center text-xs">
                    {index + 1}
                  </span>
                )}
                <span className="font-medium">{step.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">{renderStepContent()}</div>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background">
        <div className="container py-4">
          <div className="flex justify-between items-center max-w-4xl mx-auto">
            <Button variant="outline" onClick={goBack} disabled={!canGoBack}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <span className="text-sm text-muted-foreground">
              Step {stepIndex + 1} of {STEPS.length}
            </span>

            {canGoForward ? (
              <Button onClick={goNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : currentStep !== 'save' ? (
              <Button onClick={goNext}>
                Review
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <div />
            )}
          </div>
        </div>
      </div>

      {/* PRD Dialog */}
      <Dialog open={showPRDDialog} onOpenChange={setShowPRDDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generated PRD</DialogTitle>
            <DialogDescription>
              Review and create a GitHub issue for this scenario
            </DialogDescription>
          </DialogHeader>
          <PRDCardExpanded scenario={scenario} selectedComponents={selectedComponents} />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowPRDDialog(false)}>
              Close
            </Button>
            <Button onClick={handleCreateGitHubIssue}>Create GitHub Issue</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Inline Steps Builder (simplified from ScenarioBuilder)
function StepsBuilder({
  selectedElements,
  selectedComponents,
  onAddStep,
}: {
  selectedElements: PrototypeElement[]
  selectedComponents: DSComponent[]
  onAddStep: (step: { type: string; action: string; target: string; component?: string }) => void
}) {
  const [stepType, setStepType] = useState('when')
  const [action, setAction] = useState('navigate')
  const [target, setTarget] = useState('')
  const [component, setComponent] = useState('')

  const STEP_TYPES = [
    { value: 'given', label: 'Given' },
    { value: 'when', label: 'When' },
    { value: 'then', label: 'Then' },
    { value: 'and', label: 'And' },
    { value: 'but', label: 'But' },
  ]

  const ACTIONS = [
    { value: 'navigate', label: 'Navigate' },
    { value: 'click', label: 'Click' },
    { value: 'see', label: 'See' },
    { value: 'dontSee', label: "Don't See" },
    { value: 'beAt', label: 'Be At' },
    { value: 'login', label: 'Login' },
    { value: 'logout', label: 'Logout' },
    { value: 'answer', label: 'Answer' },
  ]

  const handleElementClick = (element: PrototypeElement) => {
    setTarget(element.selector || element.idAttr || element.tag)
    if (element.tag === 'button') setComponent('Button')
    else if (element.tag === 'input') setComponent('Input')
    else if (element.tag === 'a') setComponent('Button')
  }

  const handleComponentClick = (c: DSComponent) => {
    setComponent(c.name)
  }

  const handleAdd = () => {
    if (!target) return
    onAddStep({ type: stepType, action, target, component: component || undefined })
    setTarget('')
    setComponent('')
  }

  return (
    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
      {/* Quick Select */}
      {(selectedElements.length > 0 || selectedComponents.length > 0) && (
        <div className="space-y-2">
          <Label className="text-xs">Quick Select</Label>
          <div className="flex flex-wrap gap-2">
            {selectedElements.map((el) => (
              <Button
                key={el.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleElementClick(el)}
              >
                {el.tag}
                {el.idAttr && <span className="ml-1 opacity-70">#{el.idAttr}</span>}
              </Button>
            ))}
            {selectedComponents.map((c) => (
              <Button
                key={c.name}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleComponentClick(c)}
              >
                {c.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Step Form */}
      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Type</Label>
          <Select value={stepType} onValueChange={setStepType}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STEP_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-3 space-y-1">
          <Label className="text-xs">Action</Label>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIONS.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-4 space-y-1">
          <Label className="text-xs">Target</Label>
          <Input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Selector or element"
            className="h-9"
          />
        </div>

        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Component</Label>
          <Input
            value={component}
            onChange={(e) => setComponent(e.target.value)}
            placeholder="Optional"
            className="h-9"
          />
        </div>

        <div className="col-span-1">
          <Button onClick={handleAdd} disabled={!target} className="w-full h-9">
            +
          </Button>
        </div>
      </div>
    </div>
  )
}

// Simple PRD Card for dialog
function PRDCardExpanded({
  scenario,
  selectedComponents,
}: {
  scenario: Partial<Scenario>
  selectedComponents: DSComponent[]
}) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div>
          <h3 className="font-semibold">{scenario.name || 'Untitled'}</h3>
          <Badge variant="outline" className="mt-1">
            {scenario.type || 'feature'}
          </Badge>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">Scenario</h4>
          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
            {scenario.steps?.map((s) => `${s.type}: ${s.action} ${s.target}`).join('\n') ||
              'No steps defined'}
          </pre>
        </div>

        {selectedComponents.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Design System Components</h4>
            <div className="flex flex-wrap gap-2">
              {selectedComponents.map((c) => (
                <Badge key={c.name} variant="secondary">
                  {c.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
