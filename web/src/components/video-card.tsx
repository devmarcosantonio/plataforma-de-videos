"use client";

import Link from "next/link";
import { motion, type Variants } from "motion/react";
import { formatLikes, handle, timeAgo } from "@/lib/format";
import type { User, Video } from "@/lib/types";
import { UserAvatar } from "./user-avatar";
import { VideoThumbnail } from "./video-thumbnail";

export type VideoWithAuthor = { video: Video; author: User | undefined };

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 24 } },
};

// Grade da home: os cards entram em sequência.
export function VideoGrid({ items }: { items: VideoWithAuthor[] }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
    >
      {items.map(({ video, author }) => (
        <motion.div key={video.id} variants={item}>
          <VideoCard video={video} author={author} />
        </motion.div>
      ))}
    </motion.div>
  );
}

export function VideoCard({ video, author }: VideoWithAuthor) {
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 400, damping: 28 }}>
      <Link href={`/watch/${video.id}`} className="group flex flex-col gap-3 rounded-xl outline-none">
        <VideoThumbnail
          video={video}
          sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="shadow-sm ring-1 ring-border transition-shadow duration-300 group-hover:shadow-xl group-hover:shadow-primary/10 group-focus-visible:ring-2 group-focus-visible:ring-ring"
        />
        <div className="flex gap-3">
          <UserAvatar user={author} />
          <div className="min-w-0">
            <h3 className="line-clamp-2 font-medium leading-snug transition-colors group-hover:text-primary">
              {video.title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{handle(author)}</p>
            <p className="text-sm text-muted-foreground">
              {formatLikes(video.likes_count)} · {timeAgo(video.created_at)}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function VideoListItem({ video, author, index = 0 }: VideoWithAuthor & { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 * index, type: "spring", stiffness: 260, damping: 26 }}
    >
      <Link href={`/watch/${video.id}`} className="group flex gap-3 rounded-xl p-1.5 transition-colors hover:bg-muted/60">
        <div className="w-40 shrink-0">
          <VideoThumbnail video={video} sizes="160px" className="rounded-lg" />
        </div>
        <div className="min-w-0 py-0.5">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug transition-colors group-hover:text-primary">
            {video.title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{handle(author)}</p>
          <p className="text-xs text-muted-foreground">{timeAgo(video.created_at)}</p>
        </div>
      </Link>
    </motion.div>
  );
}
