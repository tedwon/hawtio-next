import { eventService } from '@hawtiosrc/core'
import { workspace } from '@hawtiosrc/plugins/shared'
import {
  Button,
  Dropdown,
  DropdownItem,
  KebabToggle,
  Modal,
  ModalVariant,
  Skeleton,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core'
import { AsleepIcon, PlayIcon, Remove2Icon } from '@patternfly/react-icons'
import React, { useState } from 'react'
import { ContextAttributes, contextsService } from './contexts-service'

type ContextToolbarProps = {
  contexts: ContextAttributes[]
  deleteCallback: (contexts: ContextAttributes[]) => void
}

export const ContextToolbar: React.FunctionComponent<ContextToolbarProps> = ({ contexts, deleteCallback }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const onDropdownToggle = (isOpen: boolean) => {
    setIsOpen(isOpen)
  }

  const isStartEnabled = (): boolean => {
    if (contexts.length === 0) return false

    return contexts.some(ctx => {
      return ctx.state === 'Suspended'
    })
  }

  const onStartClicked = () => {
    contexts
      .filter(ctx => {
        return ctx.state === 'Suspended'
      })
      .forEach(ctx => {
        contextsService
          .startContext(ctx)
          .then(() => {
            eventService.notify({
              type: 'success',
              message: 'Camel context start requested',
            })
          })
          .catch((error: Error) => {
            eventService.notify({
              type: 'danger',
              message: error.message,
            })
          })
      })
  }

  const isSuspendEnabled = (): boolean => {
    if (contexts.length === 0) return false

    return contexts.some(ctx => {
      return ctx.state === 'Started'
    })
  }

  const onSuspendClicked = () => {
    for (const ctx of contexts) {
      if (ctx.state !== 'Started') continue

      try {
        contextsService.suspendContext(ctx)
        eventService.notify({
          type: 'success',
          message: 'Camel context suspension requested',
        })
      } catch (error) {
        eventService.notify({
          type: 'danger',
          message: error as string,
        })
      }
    }
  }

  const isDeleteEnabled = (): boolean => {
    return contexts.length > 0
  }

  const handleConfirmDeleteToggle = () => {
    setIsConfirmDeleteOpen(!isConfirmDeleteOpen)
  }

  const onDeleteClicked = () => {
    setIsOpen(false)
    handleConfirmDeleteToggle()
  }

  const onDeleteConfirmClicked = () => {
    setIsDeleting(true)
  }

  const deleteContexts = async () => {
    for (const ctx of contexts) {
      try {
        await contextsService.stopContext(ctx)
        eventService.notify({
          type: 'success',
          message: 'Camel context deleted.',
        })
      } catch (error) {
        eventService.notify({
          type: 'danger',
          message: error as string,
        })
      }
    }

    deleteCallback(contexts)
    setIsDeleting(false)
    workspace.refreshTree()
  }

  if (isDeleting) {
    deleteContexts()

    const title = `Deleting ${contexts.length > 1 ? 'Contexts' : 'Context'} ...`
    return (
      <Modal variant={ModalVariant.small} title={title} titleIconVariant='warning' isOpen={isDeleting}>
        <Skeleton screenreaderText={title} />
      </Modal>
    )
  }

  const toolbarButtons = (
    <React.Fragment>
      <ToolbarItem>
        <Button
          variant='primary'
          isSmall={true}
          isDisabled={!isStartEnabled()}
          icon={<PlayIcon />}
          onClick={onStartClicked}
        >
          Start
        </Button>
      </ToolbarItem>
      <ToolbarItem>
        <Button
          variant='danger'
          isSmall={true}
          isDisabled={!isSuspendEnabled()}
          icon={<AsleepIcon />}
          onClick={onSuspendClicked}
        >
          Suspend
        </Button>
      </ToolbarItem>
    </React.Fragment>
  )

  const ConfirmDeleteModal = () => (
    <Modal
      variant={ModalVariant.small}
      title='Are you sure?'
      titleIconVariant='danger'
      isOpen={isConfirmDeleteOpen}
      onClose={handleConfirmDeleteToggle}
      actions={[
        <Button key='delete' variant='danger' onClick={onDeleteConfirmClicked}>
          Delete
        </Button>,
        <Button key='cancel' variant='link' onClick={handleConfirmDeleteToggle}>
          Cancel
        </Button>,
      ]}
    >
      <p>You are about to delete this Camel Context.</p>
      <p>This operation cannot be undone so please be careful.</p>
    </Modal>
  )

  const dropdownItems = [
    <DropdownItem
      key='delete'
      component={
        <Button variant='plain' isDisabled={!isDeleteEnabled()} onClick={onDeleteClicked}>
          <Remove2Icon /> Delete
        </Button>
      }
    />,
  ]

  return (
    <React.Fragment>
      <Toolbar id='toolbar-items'>
        <ToolbarContent>
          {toolbarButtons}
          <ToolbarItem>
            <Dropdown
              autoFocus={true}
              toggle={<KebabToggle id='toggle-kebab' onToggle={onDropdownToggle} />}
              isOpen={isOpen}
              dropdownItems={dropdownItems}
              isPlain
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
      <ConfirmDeleteModal />
    </React.Fragment>
  )
}
