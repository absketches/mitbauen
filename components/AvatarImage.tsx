import Image from 'next/image'

type Props = {
  src: string
  alt: string
  size: number
  className?: string
}

export default function AvatarImage({ src, alt, size, className }: Props) {
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      sizes={`${size}px`}
      className={className ?? 'h-full w-full object-cover'}
    />
  )
}
