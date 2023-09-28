'use client'

import { useState, useEffect, useCallback } from 'react'
import { HumanizeDurationLanguage, HumanizeDuration } from 'humanize-duration-ts'
import usePartySocket from 'partysocket/react'
import type { Poem, Message, Word, Words } from '@/partykit/shared'
import ConnectionStatus from './ConnectionStatus'
import Reset from './Reset'
import { MagneticPoem } from './MagneticPoem'


import { useFireproof } from 'use-fireproof'
import Link from 'next/link'

const humanizer = new HumanizeDuration(new HumanizeDurationLanguage())
humanizer.addLanguage('shortEn', {
  y: () => 'y',
  mo: () => 'mo',
  w: () => 'w',
  d: () => 'd',
  h: () => 'h',
  m: () => 'm',
  s: () => 's',
  ms: () => 'ms',
  decimal: '.'
})

export default function Room(props: { roomId: string }) {
  const { roomId } = props
  const [poem, setPoem] = useState<null | Poem>(null)
  const [turnDue, setTurnDue] = useState(false)
  const [time, setTime] = useState(new Date())

  const { database, useLiveQuery } = useFireproof('poetry-party')
  const savedPoems = useLiveQuery('startedAt').docs as Poem[]

  const socket = usePartySocket({
    host: process.env.NEXT_PUBLIC_PARTYKIT_HOST!,
    //party: "main",
    room: roomId,
    onMessage: message => {
      const msg = JSON.parse(message.data as string) as Message
      if (msg.type === 'sync') {
        setPoem(msg.poem)
        setTurnDue(true)
      } else if (msg.type === 'update') {
        if (!poem) return
        const newWords = { ...poem.words }
        newWords[msg.word.id] = msg.word
        const newPoem = {
          ...poem,
          words: newWords,
          turns: msg.turns,
          players: msg.players
        }
        // console.log("newPoem", newPoem);
        setPoem(newPoem)
        setTurnDue(true)
      }
    }
  })

  const setWords = useCallback(
    (words: Words) => {
      if (!poem) return
      const newPoem = {
        ...poem,
        words: words
      }
      setPoem(newPoem)
    },
    [setPoem, poem]
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  if (!poem) {
    return <div>Loading...</div>
  }

  const handleTurn = (word: Word) => {
    setTurnDue(false)
    socket.send(
      JSON.stringify({
        type: 'turn',
        word: word
      })
    )
  }

  const handleReset = () => {
    socket.send(
      JSON.stringify({
        type: 'reset'
      })
    )
  }

  const handleSave = () => {
    console.log('save', JSON.stringify(poem))
    database.put(poem)
  }

  const startedAgo = Math.max(
    0,
    Math.floor((time.getTime() - new Date(poem.startedAt).getTime()) / 1000)
  )
  const startedAgoHuman = humanizer.humanize(startedAgo * 1000, {
    language: 'shortEn',
    spacer: ''
  })

  console.log('savedPoems', savedPoems)

  return (
    <>
      <ConnectionStatus socket={socket} />
      <div className="flex flex-col gap-4 justify-start items-center">
        <h2 className="text-xl font-semibold">Arrange, save, and share.</h2>
        <div className="flex flex-row flex-wrap gap-2 text-sm">
          <p>Turns: {poem.turns}</p>
          <p>Players: {poem.players}</p>
          <p>Started: {startedAgoHuman} ago</p>
        </div>
        <MagneticPoem words={poem.words} setWords={setWords} handleTurn={handleTurn} />
        <div className="mt-12 flex justify-center">
          <Reset handleReset={handleReset} />
          <button
            className="bg-white hover:bg-green-200 ml-4 px-2 py-1 rounded-sm"
            onClick={() => handleSave()}
          >
            Save poem
          </button>
        </div>
        <div className="mt-12 flex justify-center">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">Saved Poems</h2>
            <ul>

            </ul>
            {savedPoems.map((doc, i) => (
              <li key={i}>
              <Link href={`/poem/${doc._id}`}>{Object.values(doc.words).map((w)=>w.text).join()}</Link>
              </li>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

export async function getServerSideProps() {
  // By returning an empty object, Next.js will disable SSR for this page.
  return { props: {} };
}