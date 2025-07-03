"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PlusCircle, Trash2 } from "lucide-react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"

interface Team {
  id: string
  name: string
  participants: Participant[]
}

interface Participant {
  id: string
  name: string
  teamId?: string
}

interface TeamManagementProps {
  participants: Participant[]
  initialTeams?: Team[]
  onSave: (teams: Team[]) => void
}

export function TeamManagement({ participants, initialTeams = [], onSave }: TeamManagementProps) {
  const [teams, setTeams] = useState<Team[]>(
    initialTeams.length > 0 ? initialTeams : [{ id: crypto.randomUUID(), name: "チーム1", participants: [] }],
  )

  const [unassignedParticipants, setUnassignedParticipants] = useState<Participant[]>(
    participants.filter((p) => !p.teamId),
  )

  const addTeam = () => {
    setTeams([
      ...teams,
      {
        id: crypto.randomUUID(),
        name: `チーム${teams.length + 1}`,
        participants: [],
      },
    ])
  }

  const removeTeam = (teamId: string) => {
    const teamToRemove = teams.find((t) => t.id === teamId)
    if (teamToRemove) {
      setUnassignedParticipants([...unassignedParticipants, ...teamToRemove.participants])
    }
    setTeams(teams.filter((t) => t.id !== teamId))
  }

  const updateTeamName = (teamId: string, newName: string) => {
    setTeams(teams.map((team) => (team.id === teamId ? { ...team, name: newName } : team)))
  }

  const handleOnDragEnd = (result: any) => {
    if (!result.destination) return

    const { source, destination } = result

    // 同じリストでの並べ替え
    if (source.droppableId === destination.droppableId) {
      if (source.droppableId === "unassigned") {
        const items = Array.from(unassignedParticipants)
        const [reorderedItem] = items.splice(source.index, 1)
        items.splice(destination.index, 0, reorderedItem)
        setUnassignedParticipants(items)
      } else {
        const teamIndex = teams.findIndex((t) => t.id === source.droppableId)
        if (teamIndex !== -1) {
          const teamsCopy = [...teams]
          const items = Array.from(teamsCopy[teamIndex].participants)
          const [reorderedItem] = items.splice(source.index, 1)
          items.splice(destination.index, 0, reorderedItem)
          teamsCopy[teamIndex].participants = items
          setTeams(teamsCopy)
        }
      }
    } else {
      // 異なるリスト間の移動
      let itemToMove

      if (source.droppableId === "unassigned") {
        const sourceItems = [...unassignedParticipants]
        ;[itemToMove] = sourceItems.splice(source.index, 1)
        setUnassignedParticipants(sourceItems)

        const teamIndex = teams.findIndex((t) => t.id === destination.droppableId)
        if (teamIndex !== -1) {
          const teamsCopy = [...teams]
          teamsCopy[teamIndex].participants.splice(destination.index, 0, {
            ...itemToMove,
            teamId: destination.droppableId,
          })
          setTeams(teamsCopy)
        }
      } else if (destination.droppableId === "unassigned") {
        const sourceTeamIndex = teams.findIndex((t) => t.id === source.droppableId)
        if (sourceTeamIndex !== -1) {
          const teamsCopy = ([...teams][itemToMove] = teamsCopy[sourceTeamIndex].participants.splice(source.index, 1))
          setTeams(teamsCopy)

          const unassignedCopy = [...unassignedParticipants]
          unassignedCopy.splice(destination.index, 0, {
            ...itemToMove,
            teamId: undefined,
          })
          setUnassignedParticipants(unassignedCopy)
        }
      } else {
        // チーム間の移動
        const sourceTeamIndex = teams.findIndex((t) => t.id === source.droppableId)
        const destTeamIndex = teams.findIndex((t) => t.id === destination.droppableId)

        if (sourceTeamIndex !== -1 && destTeamIndex !== -1) {
          const teamsCopy = ([...teams][itemToMove] = teamsCopy[sourceTeamIndex].participants.splice(source.index, 1))
          teamsCopy[destTeamIndex].participants.splice(destination.index, 0, {
            ...itemToMove,
            teamId: destination.droppableId,
          })
          setTeams(teamsCopy)
        }
      }
    }
  }

  const handleSave = () => {
    onSave(teams)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>チーム管理</CardTitle>
      </CardHeader>
      <CardContent>
        <DragDropContext onDragEnd={handleOnDragEnd}>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="font-medium">未割り当て参加者</div>
              <Droppable droppableId="unassigned">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="min-h-[100px] rounded-md border p-4"
                  >
                    {unassignedParticipants.length === 0 ? (
                      <div className="text-center text-muted-foreground p-4">参加者がいません</div>
                    ) : (
                      unassignedParticipants.map((participant, index) => (
                        <Draggable key={participant.id} draggableId={participant.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="mb-2 rounded-md border bg-background p-2"
                            >
                              {participant.name}
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="font-medium">チーム</div>
                <Button variant="outline" size="sm" onClick={addTeam}>
                  <PlusCircle className="h-4 w-4 mr-1" />
                  チーム追加
                </Button>
              </div>

              <div className="space-y-4">
                {teams.map((team) => (
                  <div key={team.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Input
                        value={team.name}
                        onChange={(e) => updateTeamName(team.id, e.target.value)}
                        className="max-w-[200px]"
                      />
                      <Button variant="ghost" size="sm" onClick={() => removeTeam(team.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <Droppable droppableId={team.id}>
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="min-h-[100px] rounded-md border p-4"
                        >
                          {team.participants.length === 0 ? (
                            <div className="text-center text-muted-foreground p-4">参加者をドラッグしてください</div>
                          ) : (
                            team.participants.map((participant, index) => (
                              <Draggable key={participant.id} draggableId={participant.id} index={index}>
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className="mb-2 rounded-md border bg-background p-2"
                                  >
                                    {participant.name}
                                  </div>
                                )}
                              </Draggable>
                            ))
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DragDropContext>

        <Button onClick={handleSave} className="w-full mt-6">
          チーム設定を保存
        </Button>
      </CardContent>
    </Card>
  )
}
