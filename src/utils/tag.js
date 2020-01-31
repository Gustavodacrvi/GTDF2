

export default {
  tagOptions: tag => ({dispatch, getters, tags, tasks, commit}) => {
    const showDelete = !tags.some(el => el.parent === tag.id)
    const opt = [
      {
        name: 'Edit tag',
        icon: 'pen',
        callback: () => dispatch('pushPopup', {
            comp: 'AddTag', payload: {...tag, editing: true}, naked: true
          })
      },
      {
        name: 'Add subtag',
        icon: 'arrow',
        callback: () => {
          dispatch('pushPopup', {comp: 'AddTag', payload: {
            parent: tag.id,
          }, naked: true})
        },
      },
      {
        name: 'Move tag below',
        icon: 'tag',
        callback: () => {
          dispatch('pushPopup', {
            comp: 'FastSearch',
            payload: {
              callback: (route, {id}) => {
                if (id !== tag.id)
                  dispatch('tag/moveTagBelow', {
                    target: tag.id, tagId: id,
                  })
              },
              allowed: ['tags'],
            }
          })
        },
      },
      {
        name: "Toggle favorite",
        icon: 'heart',
        callback: () => {
          dispatch('tag/saveTag', {
            id: tag.id, favorite: !tag.favorite,
          })
        }
      },
    ]
    if (!tag.notes)
      opt.push({
        name: 'Add notes',
        icon: 'note',
        callback: () => dispatch('pushPopup', {
          comp: 'AddTagNote',
          payload: tag.id,
          naked: true
        })
      })
    if (showDelete)
      opt.push({
        name: 'Delete tag',
        icon: 'trash',
        important: true,
        callback: () => dispatch('tag/deleteTag', {id: tag.id, tasks})
      })
    return opt
  }
}
