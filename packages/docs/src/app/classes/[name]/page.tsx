import getClass from '@/data/get-class';
import { Prose } from '@/components/Prose';
import getClassGroups from '@/data/get-class-groups';
import { v4 as uuidv4 } from 'uuid';
import { Content, DefinedIn, Group, Header } from '@/components/docs';

export default function Page({ params }: { params: { name: string } }) {
  const meshClass = getClass(params.name);
  const meshGroup = getClassGroups(meshClass.name);

  return (
    <article className="flex h-full flex-col pb-10 pt-16">
      <Prose className="flex-auto">
        <Header meshObject={meshClass} />
        <Content comment={meshClass.comment} isMain={true} />
        <DefinedIn sources={meshClass.sources} />

        {meshGroup.map((group, i) => {
          return <Group group={group} key={uuidv4()} />;
        })}
      </Prose>
      {/* <footer className="mx-auto mt-16 w-full max-w-2xl lg:max-w-5xl">
        <Feedback />
      </footer> */}
    </article>
  );
}
